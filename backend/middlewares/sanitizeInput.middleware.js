import ExpressMongoSanitize from 'express-mongo-sanitize';

export const sanitizeInput = (app) => {
    app.use(ExpressMongoSanitize({ replaceWith: "_" }));
}