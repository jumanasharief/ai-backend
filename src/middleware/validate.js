export const validate =
  (schema) =>
  (req, res, next) => {
    try {
      req.valid = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (e) {
      return res.status(400).json({ error: "Validation failed", details: e.errors });
    }
  };
