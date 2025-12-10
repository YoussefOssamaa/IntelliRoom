import express from 'express';



export const getProductsController =   (req, res) => {
  res.send('List of products');
} 

export const postProductsController =   (req, res) => {
  res.send('Create a new product');
}

export const putProductsController =   (req, res) => {
  res.send(`Update product with ID: ${req.params.id}`);
}






export const deleteProductsController =   async (req, res) => {
try{
  const {id} = req.params.id;
  const deleted_product = await Object.findByIdAndDelete(id);  // Assume this function is defined elsewhere to handle deletion logic

  if (!deleted_product){
    return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ message: "Product deleted successfully" });
}
catch (err){
    return res.status(500).json({ error: err.message });}

}




