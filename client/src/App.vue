```html
<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { ref } from 'vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const isMobileMenuOpen = ref(false)

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function logout() {
  auth.logout()
  closeMobileMenu()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[#1A1A1A] flex flex-col font-sans text-gray-100">
    <nav 
      class="transition-colors duration-300 w-full z-50 border-b border-white/10"
      :class="[
        route.path === '/' 
          ? 'absolute top-0 left-0 bg-transparent border-transparent' 
          : 'bg-[#1A1A1A] shadow-sm'
      ]"
      v-show="!route.path.startsWith('/exam')"
    >
      <div :class="[
        (route.path.startsWith('/problem/') && route.path.length > 9) 
          ? 'w-full' 
          : 'max-w-7xl mx-auto',
        'px-4 sm:px-6 lg:px-8'
      ]">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <!-- Logo -->
            <router-link to="/" class="flex items-center group mr-8" @click="closeMobileMenu">
              <span class="font-bold text-xl tracking-tight text-white group-hover:text-teal-400 transition-colors">APCS Practice</span>
            </router-link>
            
            <!-- Desktop Menu -->
            <div class="hidden md:flex ml-2 space-x-4">
              <router-link to="/concept" 
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/10"
                active-class="bg-white/10 text-white"
              >Concept Quiz</router-link>
              <router-link to="/problem" 
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/10"
                active-class="bg-white/10 text-white"
              >Coding Problems</router-link>
              <router-link to="/exam" class="bg-indigo-600 hover:bg-indigo-700 text-white ml-2 px-3 py-2 rounded-md text-sm font-medium shadow-sm">Start Mock Exam</router-link>
              <router-link v-if="auth.user" to="/profile" 
                  class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/10"
                  active-class="bg-white/10 text-white"
                >My Dashboard</router-link>
              <router-link v-if="auth.user && auth.user.role === 'admin'" to="/admin" 
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/10"
                active-class="bg-white/10 text-white"
              >Admin Portal</router-link>
            </div>
          </div>
          
          <!-- Right Side Desktop -->
          <div class="hidden md:flex items-center space-x-4">
             <template v-if="auth.user">
                <router-link to="/profile" 
                  class="text-sm mr-2 text-gray-300 hover:text-white"
                >Hi, {{ auth.user.email }}</router-link>
                <button @click="logout" 
                  class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-red-400"
                >Logout</button>
             </template>
             <template v-else>
                <router-link to="/login" 
                  class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/10"
                >Login</router-link>
                <router-link to="/register" class="bg-[#00B8A3] hover:bg-[#00a08e] text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Sign Up</router-link>
             </template>
          </div>

          <!-- Mobile Menu Button -->
          <div class="flex items-center md:hidden">
            <button @click="toggleMobileMenu" class="text-gray-300 hover:text-white p-2">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path v-if="!isMobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div v-show="isMobileMenuOpen" class="md:hidden bg-[#1A1A1A] border-b border-white/10">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <router-link to="/concept" @click="closeMobileMenu"
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10"
            active-class="bg-white/10 text-white"
          >Concept Quiz</router-link>
          <router-link to="/problem" @click="closeMobileMenu"
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10"
            active-class="bg-white/10 text-white"
          >Coding Problems</router-link>
          <router-link to="/exam" @click="closeMobileMenu"
            class="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >Start Mock Exam</router-link>
          
          <template v-if="auth.user">
             <router-link to="/profile" @click="closeMobileMenu"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10"
                active-class="bg-white/10 text-white"
              >My Dashboard</router-link>
             <router-link v-if="auth.user.role === 'admin'" to="/admin" @click="closeMobileMenu"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10"
                active-class="bg-white/10 text-white"
              >Admin Portal</router-link>
             
             <div class="border-t border-gray-700 pt-4 mt-4">
               <div class="flex items-center px-3 mb-3">
                 <div class="text-base font-medium text-white">{{ auth.user.email }}</div>
               </div>
               <button @click="logout" 
                 class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-red-400 hover:bg-white/10"
               >Logout</button>
             </div>
          </template>
          <template v-else>
             <router-link to="/login" @click="closeMobileMenu"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10"
              >Login</router-link>
             <router-link to="/register" @click="closeMobileMenu"
                class="block px-3 py-2 rounded-md text-base font-medium text-white bg-[#00B8A3] hover:bg-[#00a08e] mt-2"
              >Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main :class="(route.path === '/' || route.path.startsWith('/problem/') || route.path.startsWith('/exam') || route.path === '/login' || route.path === '/register') ? 'p-0 w-full' : 'py-10'">
      <RouterView />
    </main>
  </div>
</template>
