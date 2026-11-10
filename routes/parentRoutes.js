const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const parentController = require('../controllers/parentController');

const router = express.Router();

router.use(requireAuth);
router.get('/dashboard', parentController.parentOnly, parentController.dashboard);
router.get('/requests/incoming', parentController.parentOnly, parentController.incomingRequests);
router.patch('/requests/:requestId', parentController.parentOnly, parentController.respondToRequest);
router.get('/requests/mine', parentController.studentOnly, parentController.myRequests);
router.post('/requests', parentController.studentOnly, parentController.createRequest);
router.get('/links', parentController.adminOnly, parentController.listLinks);
router.post('/links', parentController.adminOnly, parentController.createLink);
router.delete('/links/:parentId/:studentId', parentController.adminOnly, parentController.removeLink);

module.exports = router;
