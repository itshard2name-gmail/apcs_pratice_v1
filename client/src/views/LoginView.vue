<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] flex bg-[#1A1A1A]">
    <!-- Left Panel: Branding / Visual -->
    <div class="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] relative overflow-hidden items-center justify-center">
        <div class="absolute inset-0 z-0 opacity-20">
             <div class="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
             <div class="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>
        
        <div class="relative z-10 text-center px-12">
            <h2 class="text-4xl font-bold text-white mb-6">Welcome Back</h2>
            <p class="text-gray-400 text-lg">"The only way to learn a new programming language is by writing programs in it."</p>
            <p class="text-gray-500 mt-4">— Dennis Ritchie</p>
        </div>
    </div>

    <!-- Right Panel: Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24">
      <div class="w-full max-w-md space-y-8">
        <div class="text-center lg:text-left">
          <h2 class="mt-6 text-3xl font-bold tracking-tight text-white">Sign in to APCS Practice</h2>
          <p class="mt-2 text-sm text-gray-400">
            Or <router-link to="/register" class="font-medium text-teal-400 hover:text-teal-300">create a new account</router-link>
          </p>
        </div>

        <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-4">
            <div>
              <label for="email-address" class="block text-sm font-medium text-gray-300 mb-1">Email address</label>
              <input v-model="email" id="email-address" name="email" type="email" required 
                class="block w-full rounded-lg border-[#333] px-4 py-3 text-white shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-[#252526] border placeholder-gray-500" 
                placeholder="you@example.com" />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input v-model="password" id="password" name="password" type="password" required 
                class="block w-full rounded-lg border-[#333] px-4 py-3 text-white shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-[#252526] border placeholder-gray-500" 
                placeholder="••••••••" />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 rounded border-[#333] bg-[#252526] text-teal-600 focus:ring-teal-500">
              <label for="remember-me" class="ml-2 block text-sm text-gray-300">Remember me</label>
            </div>
            <div class="text-sm">
              <a href="#" class="font-medium text-teal-400 hover:text-teal-300">Forgot password?</a>
            </div>
          </div>

          <div v-if="error" class="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{{ error }}</div>

          <div>
            <button type="submit" 
                class="group relative flex w-full justify-center rounded-full bg-[#00B8A3] px-8 py-3 text-sm font-semibold text-white hover:bg-[#00a08e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors shadow-lg shadow-teal-500/30">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-blob {
    animation: blob 7s infinite;
}
.animation-delay-2000 {
    animation-delay: 2s;
}
@keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
}
</style>
