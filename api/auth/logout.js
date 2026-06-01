module.exports = (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    res.status(200).json({ success: true });
};
