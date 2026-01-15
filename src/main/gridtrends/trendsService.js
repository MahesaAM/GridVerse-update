
class TrendsService {
    async getDailyTrends(geo = 'US') {
        // User requested to remove this if it causes errors.
        // Returning empty array to disable this feature safely.
        return [];
    }

    async getInterestOverTime(keyword) {
        return [];
    }
}

module.exports = new TrendsService();
