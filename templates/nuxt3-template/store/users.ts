export const useUserStore = defineStore('users', () => {
  const users = ref({})
  const getUserInfo = () => {}
  return {
    users,
    getUserInfo
  }
}) 