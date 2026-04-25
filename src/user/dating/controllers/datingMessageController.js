const { createResponse, createErrorResponse } = require('../../../utils/apiResponse');
const DatingChatService = require('../services/datingChatService');
const DatingMessageService = require('../services/datingMessageService');
const DatingMatch = require('../models/datingMatchModel');
const User = require('../../auth/model/userAuthModel');

/**
 * Dating message handlers — aligned with social `enhancedMessageController`
 * (`createResponse` / `createErrorResponse`, status codes, payload shape).
 * Dating-only checks (active match, block lists) stay in the controller layer.
 */

async function sendDatingMessage(req, res) {
  try {
    const { matchId, message, type = 'text', replyTo, forwardedFrom } = req.body || {};
    const currentUserId = req.user?.userId;
    const file = req.file || null;

    if (!matchId) {
      return res.status(400).json(createErrorResponse('Match ID is required'));
    }

    if (type === 'text' && (!message || typeof message !== 'string' || !message.trim())) {
      return res.status(400).json(createErrorResponse('Message content is required for text messages'));
    }

    if (['audio', 'video', 'image', 'document', 'gif', 'voice'].includes(type) && !file) {
      return res.status(400).json(createErrorResponse('File is required for media messages'));
    }

    if (type === 'location') {
      if (
        !req.body.location ||
        typeof req.body.location.latitude !== 'number' ||
        typeof req.body.location.longitude !== 'number'
      ) {
        return res
          .status(400)
          .json(createErrorResponse('Valid location data (latitude, longitude) is required for location messages'));
      }
    }

    const match = await DatingMatch.findById(matchId).select('userA userB status').lean();
    if (!match) {
      return res.status(404).json(createErrorResponse('Match not found'));
    }

    const userAId = match.userA.toString();
    const userBId = match.userB.toString();
    const currentUserIdStr = currentUserId.toString();

    if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
      return res.status(403).json(createErrorResponse('You are not part of this match'));
    }

    if (match.status !== 'active') {
      return res.status(400).json(createErrorResponse('Match is not active'));
    }

    const otherUserId = userAId === currentUserIdStr ? userBId : userAId;
    const [currentUser, otherUser] = await Promise.all([
      User.findById(currentUserId).select('blockedUsers blockedBy'),
      User.findById(otherUserId).select('blockedUsers blockedBy')
    ]);

    if (currentUser && otherUser) {
      const currentBlockedSet = new Set((currentUser.blockedUsers || []).map((id) => id.toString()));
      const otherBlockedSet = new Set((otherUser.blockedUsers || []).map((id) => id.toString()));
      const currentBlockedBySet = new Set((currentUser.blockedBy || []).map((id) => id.toString()));
      const otherBlockedBySet = new Set((otherUser.blockedBy || []).map((id) => id.toString()));

      const currentBlockedOther = currentBlockedSet.has(otherUserId);
      const otherBlockedCurrent = otherBlockedSet.has(currentUserIdStr);
      const currentInOtherBlockedBy = otherBlockedBySet.has(currentUserIdStr);
      const otherInCurrentBlockedBy = currentBlockedBySet.has(otherUserId);

      const isBlocked =
        currentBlockedOther || otherBlockedCurrent || currentInOtherBlockedBy || otherInCurrentBlockedBy;

      if (isBlocked) {
        return res.status(403).json(createErrorResponse('Cannot send message: Users have blocked each other'));
      }
    }

    const chat = await DatingChatService.getOrCreateMatchChat(matchId, currentUserId);

    const messageData = {
      chatId: chat._id,
      senderId: currentUserId,
      type,
      content: message ? message.trim().slice(0, 4096) : '',
      replyTo: replyTo || null,
      forwardedFrom: forwardedFrom || null,
      clientMessageId: req.body.clientMessageId || null,
      isOneView: req.body.isOneView === true || req.body.isOneView === 'true',
      oneViewExpirationHours: req.body.oneViewExpirationHours || null,
      location: req.body.location || null,
      gifSource: req.body.gifSource || null,
      gifId: req.body.gifId || null,
      musicMetadata: req.body.musicMetadata || null,
      duration: req.body.duration || null,
      width: req.body.width || null,
      height: req.body.height || null
    };

    const newMessage = await DatingMessageService.sendMessage(messageData, file);

    res.status(201).json(
      createResponse('Message sent successfully', { message: newMessage }, {
        messageId: newMessage.messageId || newMessage._id,
        chatId: chat._id
      })
    );
  } catch (error) {
    console.error('[DatingMessageController] sendDatingMessage error:', error.message);

    const msg = error.message || '';
    let statusCode = 500;
    if (msg.includes('not found') || msg.includes('Access denied')) {
      statusCode = 404;
    } else if (msg.includes('required') || msg.includes('Invalid') || msg.includes('too large')) {
      statusCode = 400;
    } else if (msg.includes('permission') || msg.includes('blocked each other')) {
      statusCode = 403;
    }

    res.status(statusCode).json(createErrorResponse(msg, statusCode));
  }
}

async function getDatingMessages(req, res) {
  try {
    const { chatId, matchId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const currentUserId = req.user?.userId;

    let finalChatId = chatId;

    if (matchId && !chatId) {
      const match = await DatingMatch.findById(matchId).select('userA userB status').lean();
      if (!match) {
        return res.status(404).json(createErrorResponse('Match not found'));
      }

      const userAId = match.userA.toString();
      const userBId = match.userB.toString();
      const currentUserIdStr = currentUserId.toString();

      if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
        return res.status(403).json(createErrorResponse('You are not part of this match'));
      }

      const chat = await DatingChatService.getOrCreateMatchChat(matchId, currentUserId);
      finalChatId = chat._id.toString();
    } else if (!chatId) {
      return res.status(400).json(createErrorResponse('Chat ID or Match ID is required'));
    }

    const result = await DatingMessageService.getChatMessages(finalChatId, currentUserId, page, limit);

    res.status(200).json(
      createResponse('Messages retrieved successfully', result, {
        chatId: finalChatId,
        pagination: result.pagination
      })
    );
  } catch (error) {
    console.error('[DatingMessageController] getDatingMessages error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('Invalid')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function getDatingConversations(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const matches = await DatingMatch.find({
      status: 'active',
      $or: [{ userA: currentUserId }, { userB: currentUserId }]
    })
      .select('userA userB createdAt lastInteractionAt')
      .sort({ lastInteractionAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const UserModel = require('../../auth/model/userAuthModel');
    const DatingMessage = require('../models/datingMessageModel');

    const conversations = await Promise.all(
      matches.map(async (match) => {
        try {
          const chat = await DatingChatService.getOrCreateMatchChat(match._id.toString(), currentUserId);

          const otherUserId =
            match.userA.toString() === currentUserId.toString() ? match.userB : match.userA;

          const [otherUser, chatDetails, lastMsg] = await Promise.all([
            UserModel.findById(otherUserId).select('username fullName profilePictureUrl').lean(),
            DatingChatService.getChatDetails(chat._id, currentUserId),
            chat.lastMessage
              ? DatingMessage.findById(chat.lastMessage)
                  .select('content type createdAt senderId')
                  .populate('senderId', 'username fullName')
                  .lean()
              : Promise.resolve(null)
          ]);

          return {
            matchId: match._id,
            chatId: chat._id,
            user: {
              _id: otherUser._id,
              username: otherUser.username,
              fullName: otherUser.fullName,
              profilePictureUrl: otherUser.profilePictureUrl
            },
            lastMessage: lastMsg
              ? {
                  content: lastMsg.content,
                  type: lastMsg.type,
                  createdAt: lastMsg.createdAt,
                  senderId: lastMsg.senderId
                }
              : null,
            lastMessageAt: chat.lastMessageAt || match.lastInteractionAt,
            unreadCount: chatDetails.unreadCount || 0,
            matchedAt: match.createdAt
          };
        } catch (err) {
          console.error('[DATING][CONVERSATIONS] Error processing match:', match._id, err?.message || err);
          return null;
        }
      })
    );

    const validConversations = conversations.filter((conv) => conv !== null);
    validConversations.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json(
      createResponse(
        'Conversations retrieved successfully',
        {
          conversations: validConversations,
          pagination: {
            page,
            limit,
            total: validConversations.length
          }
        },
        null
      )
    );
  } catch (error) {
    console.error('[DatingMessageController] getDatingConversations error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('Invalid')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function editDatingMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json(createErrorResponse('Message content is required'));
    }

    const result = await DatingMessageService.editMessage(messageId, userId, content);

    res.status(200).json(createResponse('Message edited successfully', result, { messageId }));
  } catch (error) {
    console.error('[DatingMessageController] editDatingMessage error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('too old') || error.message.includes('deleted')) {
      statusCode = 400;
    } else if (error.message.includes('only edit your own')) {
      statusCode = 403;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function deleteDatingMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body || {};
    const userId = req.user?.userId;

    const result = await DatingMessageService.deleteMessage(messageId, userId, deleteForEveryone);

    res.status(200).json(
      createResponse(
        deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted successfully',
        result,
        { messageId, deleteForEveryone: result.deletedForEveryone }
      )
    );
  } catch (error) {
    console.error('[DatingMessageController] deleteDatingMessage error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('already deleted')) {
      statusCode = 400;
    } else if (error.message.includes('older than 1 hour')) {
      statusCode = 400;
    } else if (error.message.includes('only delete your own')) {
      statusCode = 403;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function reactToDatingMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.userId;

    if (!emoji) {
      return res.status(400).json(createErrorResponse('Emoji is required'));
    }

    const result = await DatingMessageService.reactToMessage(messageId, userId, emoji);

    res.status(200).json(createResponse('Reaction added successfully', result, { messageId }));
  } catch (error) {
    console.error('[DatingMessageController] reactToDatingMessage error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('deleted')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function removeDatingReaction(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const result = await DatingMessageService.removeReaction(messageId, userId);

    res.status(200).json(createResponse('Reaction removed successfully', result, { messageId }));
  } catch (error) {
    console.error('[DatingMessageController] removeDatingReaction error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function forwardDatingMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { targetChatId } = req.body;
    const userId = req.user?.userId;

    if (!targetChatId) {
      return res.status(400).json(createErrorResponse('Target chat ID is required'));
    }

    const result = await DatingMessageService.forwardMessage(messageId, targetChatId, userId);

    res.status(200).json(createResponse('Message forwarded successfully', result, { messageId, targetChatId }));
  } catch (error) {
    console.error('[DatingMessageController] forwardDatingMessage error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function searchDatingMessages(req, res) {
  try {
    const { chatId } = req.params;
    const { q: query, page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    if (!query || query.trim() === '') {
      return res.status(400).json(createErrorResponse('Search query is required'));
    }

    const result = await DatingMessageService.searchMessages(chatId, userId, query, parseInt(page, 10), parseInt(limit, 10));

    res.status(200).json(
      createResponse('Messages search completed successfully', result, {
        chatId,
        query,
        pagination: result.pagination
      })
    );
  } catch (error) {
    console.error('[DatingMessageController] searchDatingMessages error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('Invalid')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function getDatingChatMedia(req, res) {
  try {
    const { chatId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    const result = await DatingMessageService.getChatMedia(chatId, userId, type, parseInt(page, 10), parseInt(limit, 10));

    res.status(200).json(
      createResponse('Chat media retrieved successfully', result, {
        chatId,
        type,
        pagination: result.pagination
      })
    );
  } catch (error) {
    console.error('[DatingMessageController] getDatingChatMedia error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required') || error.message.includes('Invalid')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function getDatingMessageDetails(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const message = await DatingMessageService.getMessageDetails(messageId, userId);

    res.status(200).json(createResponse('Message details retrieved successfully', { message }, { messageId }));
  } catch (error) {
    console.error('[DatingMessageController] getDatingMessageDetails error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function markOneViewAsViewed(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const message = await DatingMessageService.markOneViewAsViewed(messageId, userId);

    res.status(200).json(createResponse('One-view message marked as viewed', { message }, { messageId }));
  } catch (error) {
    console.error('[DatingMessageController] markOneViewAsViewed error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('not a one-view') || error.message.includes('already viewed')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

async function markDatingMessagesAsRead(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!chatId) {
      return res.status(400).json(createErrorResponse('Chat ID is required'));
    }

    const result = await DatingMessageService.markMessagesAsRead(chatId, userId);

    res.status(200).json(createResponse('Messages marked as read successfully', result, { chatId }));
  } catch (error) {
    console.error('[DatingMessageController] markDatingMessagesAsRead error:', error.message);

    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      statusCode = 404;
    } else if (error.message.includes('required')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error.message));
  }
}

module.exports = {
  sendDatingMessage,
  getDatingMessages,
  getDatingConversations,
  editDatingMessage,
  deleteDatingMessage,
  reactToDatingMessage,
  removeDatingReaction,
  forwardDatingMessage,
  searchDatingMessages,
  getDatingChatMedia,
  getDatingMessageDetails,
  markOneViewAsViewed,
  markDatingMessagesAsRead
};
