const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
  createTemplate,
  getUserTemplates,
  getPublicTemplates,
  searchTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  addTag,
  removeTag
} = require('../userController/postTemplateController');

// Validation middleware
const validateCreateTemplate = (req, res, next) => {
  const { name, template } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Template name is required'
    });
  }
  
  if (!template) {
    return res.status(400).json({
      success: false,
      message: 'Template content is required'
    });
  }
  
  next();
};

// Template CRUD Routes
router.post('/', 
  authorize([Roles.USER]), 
  validateCreateTemplate, 
  createTemplate
);

router.get('/user', 
  authorize([Roles.USER]), 
  getUserTemplates
);

router.get('/public', 
  authorize([Roles.USER]), 
  getPublicTemplates
);

router.get('/search', 
  authorize([Roles.USER]), 
  searchTemplates
);

router.get('/:templateId', 
  authorize([Roles.USER]), 
  getTemplate
);

router.put('/:templateId', 
  authorize([Roles.USER]), 
  validateCreateTemplate, 
  updateTemplate
);

router.delete('/:templateId', 
  authorize([Roles.USER]), 
  deleteTemplate
);

// Tag management
router.post('/:templateId/tags', 
  authorize([Roles.USER]), 
  addTag
);

router.delete('/:templateId/tags', 
  authorize([Roles.USER]), 
  removeTag
);

module.exports = router;
