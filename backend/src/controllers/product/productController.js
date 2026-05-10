const getProducts = (req, res) => {
    res.status(200).json({ message: "Get all products" });
};

const getProductById = (req, res) => {
    const { id } = req.params;
    res.status(200).json({ message: `Get product with ID: ${id}` });
};

const createProduct = (req, res) => {
    const { name, price } = req.body;
    res.status(201).json({ message: `Product created: ${name} at $${price}` });
};

const updateProduct = (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;
    res.status(200).json({ message: `Product with ID: ${id} updated to ${name} at $${price}` });
}

const deleteProduct = (req, res) => {
    const { id } = req.params;
    res.status(200).json({ message: `Product with ID: ${id} deleted` });
}

export {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
}