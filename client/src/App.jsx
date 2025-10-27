import { useState, useEffect } from 'react';
import { Rings } from 'react-loader-spinner';
import { useSpring, animated } from '@react-spring/web';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [retrainStatus, setRetrainStatus] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Animation springs
  const fileUploadSpring = useSpring({
    transform: preview ? 'scale(1.05)' : 'scale(1)',
    boxShadow: preview ? '0 10px 25px -5px rgba(99, 102, 241, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    config: { tension: 300, friction: 20 }
  });

  const resultSpring = useSpring({
    opacity: prediction ? 1 : 0,
    transform: prediction ? 'translateY(0px)' : 'translateY(20px)',
    delay: 200
  });

  const successSpring = useSpring({
    opacity: showSuccess ? 1 : 0,
    transform: showSuccess ? 'translateY(0px)' : 'translateY(-20px)',
    config: { tension: 300, friction: 20 }
  });

  // Check retrain status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRetraining) {
        fetchRetrainStatus();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isRetraining]);

  const fetchRetrainStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/retrain-status');
      const data = await response.json();
      setRetrainStatus(data.status);
      if (data.status === 'completed') {
        setIsRetraining(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        fetchMetrics();
      } else if (data.status.startsWith('failed')) {
        setIsRetraining(false);
      }
    } catch (error) {
      console.error('Error fetching retrain status:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:8000/model-metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setPrediction(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setPrediction(data);
      fetchMetrics();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainStatus('starting...');
    try {
      const response = await fetch('http://localhost:8000/retrain', {
        method: 'POST',
      });
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error('Error:', error);
      setIsRetraining(false);
    }
  };

  // Data for the pie chart
  const metricsChartData = {
    labels: ['Accuracy', 'Validation Accuracy'],
    datasets: [
      {
        data: metrics ? [
          Math.round(metrics.accuracy * 100),
          Math.round(metrics.val_accuracy * 100)
        ] : [0, 0],
        backgroundColor: ['#4F46E5', '#A5B4FC'],
        borderColor: ['#4F46E5', '#A5B4FC'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Success Notification */}
      {showSuccess && (
        <animated.div 
          style={successSpring}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Model retraining completed successfully!
          </div>
        </animated.div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 sm:text-6xl sm:tracking-tight lg:text-7xl">
            Skin Cancer Classifier
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-indigo-200">
            Upload an image to check for potential skin cancer
          </p>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-3xl overflow-hidden border border-gray-700 shadow-2xl">
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="space-y-6">
                <animated.div 
                  style={fileUploadSpring}
                  className="border-2 border-dashed border-indigo-400 rounded-2xl p-6 text-center transition-all duration-300 hover:border-indigo-300"
                >
                  {preview ? (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Preview"
                        className="mx-auto h-64 object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-indigo-300">
                      <div className="relative mb-4">
                        <div className="w-16 h-16 bg-indigo-900 rounded-full opacity-20 animate-pulse"></div>
                        <svg
                          className="w-16 h-16 absolute top-0 left-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p>No image selected</p>
                    </div>
                  )}
                </animated.div>

                <div className="flex items-center justify-center">
                  <label className="flex flex-col items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-lg">
                    <span className="flex items-center">
                      {file ? 'Change Image' : 'Select Image'}
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!file || isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-300 shadow-lg ${
                    !file || isLoading
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transform hover:scale-105'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : 'Analyze Image'}
                </button>
              </div>

              {/* Results Section */}
              <div className="space-y-6">
                <div className="bg-gray-800 bg-opacity-60 rounded-2xl p-6 h-full border border-gray-700">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Rings color="#818CF8" height={100} width={100} />
                    </div>
                  ) : prediction ? (
                    <animated.div style={resultSpring} className="space-y-4">
                      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                        Analysis Results
                      </h2>
                      <div
                        className={`p-4 rounded-xl border ${
                          prediction.label === 'Cancer'
                            ? 'bg-red-900 bg-opacity-20 border-red-400'
                            : 'bg-green-900 bg-opacity-20 border-green-400'
                        } transition-all duration-300 hover:shadow-lg`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${
                              prediction.label === 'Cancer'
                                ? 'bg-red-500 bg-opacity-20 text-red-300'
                                : 'bg-green-500 bg-opacity-20 text-green-300'
                            } shadow-md`}
                          >
                            {prediction.label === 'Cancer' ? (
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            ) : (
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <h3
                              className={`text-lg font-medium ${
                                prediction.label === 'Cancer' ? 'text-red-300' : 'text-green-300'
                              }`}
                            >
                              {prediction.label}
                            </h3>
                            <div className="mt-1">
                              <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${
                                    prediction.label === 'Cancer' ? 'bg-red-400' : 'bg-green-400'
                                  }`}
                                  style={{
                                    width: `${prediction.confidence}%`,
                                  }}
                                ></div>
                              </div>
                              <p className="mt-1 text-sm text-gray-300">
                                Confidence: {prediction.confidence}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => setShowMetrics(!showMetrics)}
                          className="text-indigo-300 hover:text-white font-medium flex items-center transition-colors duration-300"
                        >
                          {showMetrics ? 'Hide' : 'Show'} Model Metrics
                          <svg
                            className={`ml-2 h-5 w-5 transform transition-transform duration-300 ${
                              showMetrics ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {showMetrics && metrics && (
                          <div className="mt-4 bg-gray-800 bg-opacity-60 p-4 rounded-xl border border-gray-700">
                            <h3 className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                              Model Performance
                            </h3>
                            {metrics.error ? (
                              <p className="text-red-400 mt-2">{metrics.error}</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                  <Pie 
                                    data={metricsChartData} 
                                    options={{
                                      plugins: {
                                        legend: {
                                          labels: {
                                            color: '#E0E7FF'
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                <div className="space-y-4">
                                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                    <p className="text-sm text-indigo-300">Training Accuracy</p>
                                    <p className="text-2xl font-semibold text-white">
                                      {Math.round(metrics.accuracy * 100)}%
                                      <span className="ml-2 text-xs text-gray-400">({metrics.accuracy.toFixed(4)})</span>
                                    </p>
                                    <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                                      <div 
                                        className="h-1.5 rounded-full bg-indigo-500" 
                                        style={{ width: `${Math.round(metrics.accuracy * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                                    <p className="text-sm text-purple-300">Validation Accuracy</p>
                                    <p className="text-2xl font-semibold text-white">
                                      {Math.round(metrics.val_accuracy * 100)}%
                                      <span className="ml-2 text-xs text-gray-400">({metrics.val_accuracy.toFixed(4)})</span>
                                    </p>
                                    <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                                      <div 
                                        className="h-1.5 rounded-full bg-purple-500" 
                                        style={{ width: `${Math.round(metrics.val_accuracy * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </animated.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-indigo-300">
                      <div className="relative mb-4">
                        <div className="w-16 h-16 bg-indigo-900 rounded-full opacity-20 animate-pulse"></div>
                        <svg
                          className="w-16 h-16 absolute top-0 left-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <p>No analysis results yet</p>
                      <p className="text-sm mt-1 text-indigo-200">
                        Upload an image and click "Analyze Image"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Retrain Section */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                    Model Management
                  </h3>
                  <p className="text-sm text-indigo-200 mt-1">
                    {isRetraining
                      ? `Status: ${retrainStatus}`
                      : 'Retrain the model with latest data'}
                  </p>
                </div>
                <button
                  onClick={handleRetrain}
                  disabled={isRetraining}
                  className={`mt-3 sm:mt-0 py-2 px-6 rounded-lg font-medium text-white transition-all duration-300 ${
                    isRetraining
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transform hover:scale-105 shadow-lg'
                  }`}
                >
                  {isRetraining ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Retraining...
                    </span>
                  ) : 'Retrain Model'}
                </button>
              </div>
              {isRetraining && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{
                        width: retrainStatus === 'completed' ? '100%' : 
                               retrainStatus === 'training' ? '66%' : '33%',
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-indigo-300 mt-12 pb-6">
        Made with ❤️ by ©Sreyashi Saha
      </footer>
    </div>
  );
}