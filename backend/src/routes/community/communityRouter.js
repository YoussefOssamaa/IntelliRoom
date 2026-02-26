import express from "express";
import {
  createPostController,
  getAllPostsController,
  getPostByIdController,
  updatePostController,
  deletePostController, 
    addReactionController,
    removeReactionController,
    getReactionsController,
    addCommentController,
    getCommentsController,
    deleteCommentController,
    downloadPostController,
    importPostController
} from "../../controllers/community/communityController.js";

const router = express.Router();

router.post("/", createPostController);
router.get("/", getAllPostsController);      // ✅ filtering happens here
router.get("/:id", getPostByIdController);
router.put("/:id", updatePostController);
router.delete("/:id", deletePostController);
    
router.post("/:id/reactions/", addReactionController);
router.delete("/:id/reactions/", removeReactionController);
router.get("/:id/reactions/", getReactionsController);

router.post("/:id/comments/", addCommentController);
router.get("/:id/comments/", getCommentsController);
router.delete("/:id/comments/:commentId", deleteCommentController);

router.get("/:id/download", downloadPostController);
router.post("/import", importPostController);

export default router;

/*
POST    /community/posts
GET     /community/posts
GET     /community/posts/:id
PUT     /community/posts/:id
DELETE  /community/posts/:id

POST    /community/posts/:id/reactions
DELETE  /community/posts/:id/reactions
GET     /community/posts/:id/reactions

POST    /community/posts/:id/comments
GET     /community/posts/:id/comments
DELETE  /community/posts/:id/comments/:commentId

GET     /community/posts/:id/download
POST    /community/posts/import