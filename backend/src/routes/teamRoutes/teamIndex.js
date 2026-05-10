import express from 'express';
import { getTeamMembers } from '../../controllers/team/teamController.js';

const router = express.Router();

router.get('/', getTeamMembers);

export default router;
