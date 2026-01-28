const User = require('../../user/auth/model/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function getVerificationStats(req, res) {
   console.log('================= [VERIFICATION STATS API HIT] =================');

   try {
      const { range = 'weekly' } = req.query;
      console.log('➡️ Range received:', range);

      const now = new Date();
      let startDate;
      let groupId;
      let labelFn;
      let sortStage;

      /* ================= RANGE SETUP ================= */
      if (range === 'weekly') {
         startDate = new Date();
         startDate.setDate(now.getDate() - 6);
         startDate.setHours(0, 0, 0, 0);

         groupId = { day: { $dayOfWeek: '$verificationDocument.reviewedAt' } };
         labelFn = d => DAYS[d - 1];
         sortStage = { '_id.day': 1 };
      }
      else if (range === 'monthly') {
         startDate = new Date(now.getFullYear(), now.getMonth(), 1);

         groupId = { day: { $dayOfMonth: '$verificationDocument.reviewedAt' } };
         labelFn = d => `Day ${d}`;
         sortStage = { '_id.day': 1 };
      }
      else if (range === 'yearly') {
         startDate = new Date(now.getFullYear(), 0, 1);

         groupId = { month: { $month: '$verificationDocument.reviewedAt' } };
         labelFn = m => MONTHS[m - 1];
         sortStage = { '_id.month': 1 };
      }
      else {
         return ApiResponse.badRequest(res, 'Invalid range. Use: weekly, monthly, yearly');
      }

      /* ================= AGGREGATION ================= */
      console.log('📊 Running aggregation...');
      const matchFilter = {
         role: { $nin: ['admin', 'subadmin'] },
         verificationStatus: { $in: ['approved', 'rejected'] },
         'verificationDocument.reviewedAt': { $gte: startDate, $lte: now }  // most important change
      };
      console.log('   Match filter:', matchFilter);

      const stats = await User.aggregate([
         { $match: matchFilter },
         {
            $group: {
               _id: {
                  ...groupId,
                  status: '$verificationStatus'
               },
               count: { $sum: 1 }
            }
         },
         {
            $group: {
               _id: '$_id',
               verified: {
                  $sum: {
                     $cond: [{ $eq: ['$_id.status', 'approved'] }, '$count', 0]
                  }
               },
               rejected: {
                  $sum: {
                     $cond: [{ $eq: ['$_id.status', 'rejected'] }, '$count', 0]
                  }
               }
            }
         },
         { $sort: sortStage }
      ]);

      console.log('📈 Raw aggregation result:', JSON.stringify(stats, null, 2));

      /* ================= FORMAT ================= */
      const chart = stats.map(item => {
         const key = item._id.day || item._id.month;
         return {
            label: labelFn(key),
            verified: item.verified || 0,
            rejected: item.rejected || 0
         };
      });

      /* ================= TOTAL COUNTS ================= */
      // These can stay based on current status (not time-bound)
      const [verifiedCount, rejectedCount] = await Promise.all([
         User.countDocuments({ verificationStatus: 'approved' }),
         User.countDocuments({ verificationStatus: 'rejected' })
      ]);

      return ApiResponse.success(
         res,
         {
            range,
            verifiedCount,
            rejectedCount,
            chart,
         },
         'Verification statistics fetched successfully'
      );

   } catch (error) {
      console.error('🔥 [VERIFICATION_STATS_ERROR]', error);
      return ApiResponse.serverError(res, 'Failed to fetch verification statistics');
   }
}

module.exports = { getVerificationStats };
