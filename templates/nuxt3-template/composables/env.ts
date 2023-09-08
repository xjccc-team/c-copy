// 环境
const checkDev = (arr:string[]) => arr.some(item => ~window.location.href.indexOf(item))
export const DEBUG = process.server ? process.env.NODE_ENV === 'development' : checkDev(['local','192','-test'])