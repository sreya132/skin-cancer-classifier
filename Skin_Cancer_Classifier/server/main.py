from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.layers import GlobalAveragePooling2D, Dropout, Dense
from tensorflow.keras.utils import img_to_array
import numpy as np
import tensorflow as tf
from PIL import Image
import os, json
from io import BytesIO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
model_path = "skin_cancer_model.h5"
metrics_path = "metrics.json"
status_path = "retrain_status.json"
img_size = (224, 224)
batch_size = 32

# Load model at startup
model = load_model(model_path) if os.path.exists(model_path) else None

def set_status(status: str):
    with open(status_path, "w") as f:
        json.dump({"status": status}, f)

@app.get("/retrain-status")
def get_retrain_status():
    if os.path.exists(status_path):
        with open(status_path, "r") as f:
            return json.load(f)
    return {"status": "unknown"}

def preprocess_image(uploaded_file) -> np.ndarray:
    img = Image.open(uploaded_file).convert("RGB")
    img = img.resize(img_size)
    img_array = img_to_array(img)
    img_array = tf.expand_dims(img_array, 0) / 255.0
    return img_array

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        return {"error": "Model not loaded. Please train the model first."}

    image_data = await file.read()
    img_array = preprocess_image(BytesIO(image_data))
    prediction = model.predict(img_array)[0][0]
    confidence = float(prediction * 100)
    label = "Cancer" if prediction > 0.5 else "Non-Cancer"
    return {"label": label, "confidence": round(confidence, 2)}

@app.get("/model-metrics")
def get_model_metrics():
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {"error": "Metrics not available. Please train the model first."}

@app.post("/retrain")
def retrain_model(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_model)
    return {"message": "Retraining started in background."}

def train_model():
    global model

    set_status("in_progress")

    try:
        datagen = ImageDataGenerator(rescale=1.0 / 255)

        train_gen = datagen.flow_from_directory(
            "restructured_data/train",
            target_size=img_size,
            batch_size=batch_size,
            class_mode='binary'
        )
        val_gen = datagen.flow_from_directory(
            "restructured_data/val",
            target_size=img_size,
            batch_size=batch_size,
            class_mode='binary'
        )

        base_model = MobileNetV2(input_shape=img_size + (3,), include_top=False, weights='imagenet')
        base_model.trainable = False
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dropout(0.3)(x)
        output = Dense(1, activation='sigmoid')(x)
        new_model = Model(inputs=base_model.input, outputs=output)

        new_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        history = new_model.fit(train_gen, validation_data=val_gen, epochs=10)

        new_model.save(model_path)
        model = new_model  # hot swap

        final_metrics = {
            "accuracy": history.history['accuracy'][-1],
            "val_accuracy": history.history['val_accuracy'][-1],
            "loss": history.history['loss'][-1],
            "val_loss": history.history['val_loss'][-1],
        }
        with open(metrics_path, "w") as f:
            json.dump(final_metrics, f)

        set_status("completed")

    except Exception as e:
        set_status(f"failed: {str(e)}")
