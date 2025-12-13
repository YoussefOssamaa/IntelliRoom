import express from 'express';
import Product from '../../models/ecommerceModels/product.js';



export const getProductsByCategory =   async (req, res) => {

  
  try{
      const category_id = req.query.categoryID|| ""
      const searched_product = req.query.search || ""  
      const sort_by = req.query.sort || "featured"
      const currentPage = parseInt(req.query.page) || 1
      const page_limit = Math.min( parseInt(req.query.limit) || 40  , 100) /// items per page should be = 40 and max 100
      const skip = (currentPage - 1) * page_limit

      let sort_filter = {}
      if (sort_by === "featured"){
          sort_filter = {isFeatured: -1}
      } else if (sort_by === "lowtohigh") {
          sort_filter = {price: 1}
      } else if (sort_by === "hightolow") {
          sort_filter = {price: -1}
      }

      const search_filter = {name: {$regex: searched_product, $options: "i"  }}
      if (category_id) {
          search_filter.category = category_id
      }

      const total_products = await Product.countDocuments(search_filter)  || 0

      const products = await Product.find(search_filter)
      .skip(skip).limit(page_limit)
      .sort(sort_filter)
      console.log(products)
      res.status(200).json({
          products ,
          totalPages: Math.ceil(total_products / page_limit)
      })

  }catch(err){
    return res.status(500).json({ error: err.message });}

}


export const getProductByIdController =   async (req, res) => {

  
  try{
      const {id} = req.params;
      const product = await Product.findById(id);

      if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

      res.status(200).json(product)

  }catch(err){
    return res.status(500).json({ error: err.message });}

}





export const postProductsController =  async (req, res) => {
  
  try{
      const product_posted = req.body;
      const new_product = new Product(product_posted);
      await new_product.save();
      console.log(new_product);
      res.status(201).json(new_product);


  }catch(err){
    return res.status(500).json({ error: err.message });}

}




export const putProductsController =  async (req, res) => {

  try{
      const {id} = req.params;
      const product_updates = req.body;
      const updated_product =  await Product.findByIdAndUpdate(id, product_updates, {new: true});  

      if (!updated_product) {
          return res.status(404).json({ error: "Product not found" });
        }
      console.log(updated_product);
      res.status(200).json(updated_product);

  }catch(err){
    return res.status(500).json({ error: err.message });}

}




export const deleteProductsController =   async (req, res) => {
try{
  const {id} = req.params;
  const deleted_product = await Product.findByIdAndDelete(id);

  if (!deleted_product){
    return res.status(404).json({ message: "Product not found" });
    }
    console.log(deleted_product);
    return res.status(200).json({ message: "Product deleted successfully" });
}
catch (err){
    return res.status(500).json({ error: err.message });}

}




