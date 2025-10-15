const PostTemplate = require('../userModel/postTemplateModel');
const ApiResponse = require('../../utils/apiResponse');

// Create a new post template
async function createTemplate(req, res) {
  try {
    const { name, description, category, isPublic, template, customFields, tags } = req.body;
    const userId = req.user?.userId;

    if (!name || !template) {
      return ApiResponse.badRequest(res, 'Template name and content are required');
    }

    const templateData = {
      name,
      description: description || '',
      category: category || 'custom',
      isPublic: isPublic || false,
      createdBy: userId,
      template,
      customFields: customFields || [],
      tags: tags || []
    };

    const newTemplate = new PostTemplate(templateData);
    await newTemplate.save();

    console.log('[TEMPLATE] Template created successfully:', newTemplate._id);
    return ApiResponse.success(res, newTemplate, 'Template created successfully');
  } catch (error) {
    console.error('[TEMPLATE] Create template error:', error);
    return ApiResponse.serverError(res, 'Failed to create template');
  }
}

// Get user's templates
async function getUserTemplates(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    const templates = await PostTemplate.getUserTemplates(userId, parseInt(limit));

    return ApiResponse.success(res, {
      templates,
      pagination: {
        currentPage: parseInt(page),
        totalTemplates: templates.length,
        hasNext: templates.length === limit,
        hasPrev: page > 1
      }
    }, 'User templates retrieved successfully');
  } catch (error) {
    console.error('[TEMPLATE] Get user templates error:', error);
    return ApiResponse.serverError(res, 'Failed to get user templates');
  }
}

// Get public templates
async function getPublicTemplates(req, res) {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const templates = await PostTemplate.getPublicTemplates(category, parseInt(limit));

    return ApiResponse.success(res, {
      templates,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalTemplates: templates.length,
        hasNext: templates.length === limit,
        hasPrev: page > 1
      }
    }, 'Public templates retrieved successfully');
  } catch (error) {
    console.error('[TEMPLATE] Get public templates error:', error);
    return ApiResponse.serverError(res, 'Failed to get public templates');
  }
}

// Search templates
async function searchTemplates(req, res) {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Search query is required');
    }

    const templates = await PostTemplate.searchTemplates(q.trim(), category, parseInt(limit));

    return ApiResponse.success(res, {
      templates,
      query: q,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalTemplates: templates.length,
        hasNext: templates.length === limit,
        hasPrev: page > 1
      }
    }, 'Template search results retrieved successfully');
  } catch (error) {
    console.error('[TEMPLATE] Search templates error:', error);
    return ApiResponse.serverError(res, 'Failed to search templates');
  }
}

// Get single template
async function getTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user?.userId;

    const template = await PostTemplate.findById(templateId)
      .populate('createdBy', 'username fullName profilePictureUrl');

    if (!template) {
      return ApiResponse.notFound(res, 'Template not found');
    }

    // Check if user can view this template
    if (!template.isPublic && template.createdBy._id.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You cannot view this template');
    }

    return ApiResponse.success(res, template, 'Template retrieved successfully');
  } catch (error) {
    console.error('[TEMPLATE] Get template error:', error);
    return ApiResponse.serverError(res, 'Failed to get template');
  }
}

// Update template
async function updateTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const { name, description, category, isPublic, template, customFields, tags } = req.body;
    const userId = req.user?.userId;

    const existingTemplate = await PostTemplate.findById(templateId);
    if (!existingTemplate) {
      return ApiResponse.notFound(res, 'Template not found');
    }

    // Check if user can update this template
    if (existingTemplate.createdBy.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only update your own templates');
    }

    // Update template fields
    if (name !== undefined) existingTemplate.name = name;
    if (description !== undefined) existingTemplate.description = description;
    if (category !== undefined) existingTemplate.category = category;
    if (isPublic !== undefined) existingTemplate.isPublic = isPublic;
    if (template !== undefined) existingTemplate.template = template;
    if (customFields !== undefined) existingTemplate.customFields = customFields;
    if (tags !== undefined) existingTemplate.tags = tags;

    await existingTemplate.save();

    console.log('[TEMPLATE] Template updated successfully:', templateId);
    return ApiResponse.success(res, existingTemplate, 'Template updated successfully');
  } catch (error) {
    console.error('[TEMPLATE] Update template error:', error);
    return ApiResponse.serverError(res, 'Failed to update template');
  }
}

// Delete template
async function deleteTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user?.userId;

    const template = await PostTemplate.findById(templateId);
    if (!template) {
      return ApiResponse.notFound(res, 'Template not found');
    }

    // Check if user can delete this template
    if (template.createdBy.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only delete your own templates');
    }

    template.isActive = false;
    await template.save();

    console.log('[TEMPLATE] Template deleted successfully:', templateId);
    return ApiResponse.success(res, null, 'Template deleted successfully');
  } catch (error) {
    console.error('[TEMPLATE] Delete template error:', error);
    return ApiResponse.serverError(res, 'Failed to delete template');
  }
}

// Add tag to template
async function addTag(req, res) {
  try {
    const { templateId } = req.params;
    const { tag } = req.body;
    const userId = req.user?.userId;

    const template = await PostTemplate.findById(templateId);
    if (!template) {
      return ApiResponse.notFound(res, 'Template not found');
    }

    if (template.createdBy.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only modify your own templates');
    }

    await template.addTag(tag);

    console.log('[TEMPLATE] Tag added successfully');
    return ApiResponse.success(res, {
      tags: template.tags
    }, 'Tag added successfully');
  } catch (error) {
    console.error('[TEMPLATE] Add tag error:', error);
    return ApiResponse.serverError(res, 'Failed to add tag');
  }
}

// Remove tag from template
async function removeTag(req, res) {
  try {
    const { templateId } = req.params;
    const { tag } = req.body;
    const userId = req.user?.userId;

    const template = await PostTemplate.findById(templateId);
    if (!template) {
      return ApiResponse.notFound(res, 'Template not found');
    }

    if (template.createdBy.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only modify your own templates');
    }

    await template.removeTag(tag);

    console.log('[TEMPLATE] Tag removed successfully');
    return ApiResponse.success(res, {
      tags: template.tags
    }, 'Tag removed successfully');
  } catch (error) {
    console.error('[TEMPLATE] Remove tag error:', error);
    return ApiResponse.serverError(res, 'Failed to remove tag');
  }
}

module.exports = {
  createTemplate,
  getUserTemplates,
  getPublicTemplates,
  searchTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  addTag,
  removeTag
};
