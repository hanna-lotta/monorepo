import express from 'express'

const app = express()

const port: string = process.env.PORT || '1337'

app.use(express.static('./dist/'))

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
