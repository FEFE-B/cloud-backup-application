const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Report client-side errors
 * @route   POST /api/errors/report
 * @access  Public
 */
exports.reportError = async (req, res) => {
  try {
    const { message, stack, timestamp, userAgent, url, component, componentStack, errorCount } = req.body;
    
    console.error('Client Error Report:', {
      timestamp,
      message,
      url,
      component: component || 'Unknown',
      errorCount: errorCount || 1,
      userAgent
    });
    
    // Log the error to activity log if we have a user ID
    if (req.user && req.user.id) {
      await ActivityLog.create({
        user: req.user.id,
        action: 'client_error',
        details: `Error: ${message}. URL: ${url}. Component: ${component || 'Unknown'}`
      });
    }
    
    // Store error in a detailed log (this would be implemented based on your logging strategy)
    // For example, you might want to send it to a logging service like Sentry, LogRocket, etc.
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Error reported successfully'
    });
  } catch (error) {
    console.error('Error in error reporting endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reporting client error',
      error: error.message
    });
  }
};
