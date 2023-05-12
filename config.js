require("dotenv").config()
const Config = {
  DB_mongodb: process.env.APP_DB,
  SECRET: process.env.APP_SECRET,
  PORT: process.env.APP_PORT,
  Mysql: process.env.DATABASE,
  REFRESH_SECRET: process.env.APP_REFRESH_SECRET
}


export default Config