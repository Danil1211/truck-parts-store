const router = require('express').Router();
const upload = require('../upload/tenantMulter');
const planGuard = require('../middleware/planGuard');

router.post('/file', planGuard('uploadMedia'), upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.tenant.id}/${req.file.filename}` });
});

module.exports = router;
