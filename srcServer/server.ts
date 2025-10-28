import express from 'express'
import type { Express, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import loginRouter from './routes/login.js';
import registerRouter from './routes/register.js';
import userRouter from './routes/users.js';
import dmRouter from './routes/dm.js';
import channelsRouter from './routes/channels.js';

const port = Number(process.env.PORT) || 1337
const app: Express = express()


const logger: RequestHandler = (req: Request, _res: Response, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);  //lägg till body vid post/put
  next();
};
app.use('/', logger);
app.use(express.json());
app.use('/api/login', loginRouter);
app.use('/api/register', registerRouter);
app.use('/api/users', userRouter);
app.use('/api/dm/', dmRouter);
app.use('/api/channel/', channelsRouter);
app.use(cors());
app.use(express.static('./dist/'))

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})

// Log unhandled errors so we see stack traces in the console instead of silent exits.
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
