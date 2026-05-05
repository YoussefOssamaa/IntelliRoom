export const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        
        // $text instantly finds documents with matching words using the index
        const products = await Product.find(
            { $text: { $search: q } },
            // Optional: Sort results by relevance score
            { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(5); // Only send the top 5 matches to the header dropdown
        
        res.status(200).json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}