// 生成6位随机数的方法
export function randomCode(len = 6, exclude = []) {
  const code = Math.random().toString().slice(-len);
  if (exclude.includes(code)) return randomCode(len, exclude);
  return code;
}
