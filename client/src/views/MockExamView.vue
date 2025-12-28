<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import markdownit from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const auth = useAuthStore()
const router = useRouter()
const md = markdownit()

const examData = ref(null)
const timeLeft = ref(0)
const timerInterval = ref(null)
const currentSection = ref('concept') // 'concept' or 'coding'

// Answers
const conceptAnswers = ref({}) // { qId: index }

// UI State
const loading = ref(false)
const submitting = ref(false)
const result = ref(null)
const showStartModal = ref(true)
const selectedDifficulty = ref(0) // 0=Mixed, 1=Basic, 2=Intermediate...
const selectedLanguage = ref('cpp') // default c++

const formattedTime = computed(() => {
    const m = Math.floor(timeLeft.value / 60)
    const s = timeLeft.value % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})
// ... (startExam and other logic remains same) ...

// IN TEMPLATE, MODAL SECTION:
/*
            <div class="mb-4">
                <label class="block text-sm font-bold mb-2 text-gray-700">Programming Language</label>
                <select v-model="selectedLanguage" class="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:outline-none bg-white">
                     <option value="c">C</option>
                     <option value="cpp">C++</option>
                     <option value="java">Java</option>
                     <option value="python">Python</option>
                </select>
            </div>
*/

// IN TEMPLATE, PROBLEM LINK:
/*
                 <router-link :to="'/problem/' + q.id + '?lang=' + selectedLanguage" target="_blank" class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                     Open Problem Workspace &rarr;
                 </router-link>
*/



onMounted(async () => {
    if (!auth.token) {
        alert('Please login first')
        router.push('/login')
        return
    }
})

const startExam = async () => {
    loading.value = true
    showStartModal.value = false
    try {
        let url = '/api/exam/paper'
        if (selectedDifficulty.value > 0) {
            url += `?difficulty=${selectedDifficulty.value}`
        }
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        })
        const data = await res.json()
        examData.value = data
        timeLeft.value = 150 * 60 // 2.5 hours
        startTimer()
    } catch (e) {
        console.error(e)
        alert('Failed to start exam')
        showStartModal.value = true // Re-show modal on error
    } finally {
        loading.value = false
    }
}

const startTimer = () => {
    timerInterval.value = setInterval(() => {
        if (timeLeft.value > 0) {
            timeLeft.value--
        } else {
            clearInterval(timerInterval.value)
            submitExam()
        }
    }, 1000)
}

const submitExam = async () => {
    if (!confirm('Are you sure you want to finish the exam?')) return
    clearInterval(timerInterval.value)
    submitting.value = true
    
    try {
        const res = await fetch('/api/exam/submit', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}` 
            },
            body: JSON.stringify({
                conceptAnswers: conceptAnswers.value
            })
        })
        result.value = await res.json()
    } catch (e) {
        console.error(e)
    } finally {
        submitting.value = false
    }
}
</script>

<template>
<div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header with Timer -->
    <header class="bg-white shadow sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 class="text-xl font-bold text-gray-800">APCS Mock Exam</h1>
            <div class="text-2xl font-mono font-bold" :class="timeLeft < 300 ? 'text-red-600' : 'text-blue-600'">
                ⏱️ {{ formattedTime }}
            </div>
            <button 
                v-if="!result && !showStartModal"
                @click="submitExam" 
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">
                Finish Exam
            </button>
            <button 
                v-else-if="result"
                @click="router.push('/')" 
                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium">
                Exit
            </button>
            <button 
                v-else
                @click="router.push('/')" 
                class="text-gray-600 hover:text-gray-800 font-medium">
                Exit
            </button>
        </div>
    </header>

    <!-- Start Exam Modal -->
    <div v-if="showStartModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <h2 class="text-2xl font-bold mb-4 text-center">Start Mock Exam</h2>
            <p class="text-gray-600 mb-6 text-center">
                You are about to start a 150-minute simulated APCS exam. <br>
                Please select the difficulty for coding problems.
            </p>
            
            <div class="mb-6">
                <label class="block text-sm font-bold mb-2 text-gray-700">Detailed Difficulty</label>
                <select v-model="selectedDifficulty" class="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:outline-none bg-white">
                     <option :value="0">🎲 Mixed (Random Levels)</option>
                     <option :value="1">Level 1: Basic (初級)</option>
                     <option :value="2">Level 2: Intermediate (中級)</option>
                     <option :value="3">Level 3: Adv. Intermediate (中高級)</option>
                     <option :value="4">Level 4: Advanced (高級)</option>
                </select>
            </div>
            
            <div class="mb-6">
                <label class="block text-sm font-bold mb-2 text-gray-700">Programming Language</label>
                <select v-model="selectedLanguage" class="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:outline-none bg-white">
                     <option value="c">C</option>
                     <option value="cpp">C++</option>
                     <option value="java">Java</option>
                     <option value="python">Python</option>
                </select>
            </div>
            
            <div class="space-y-3">
                <button 
                    @click="startExam" 
                    :disabled="loading"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-3 rounded-lg shadow transition-colors flex justify-center items-center">
                    <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white border-b-transparent rounded-full mr-2"></span>
                    {{ loading ? 'Preparing Exam...' : 'Start Exam' }}
                </button>
                <button 
                    @click="router.push('/')"
                    class="w-full text-gray-500 hover:bg-gray-100 font-medium py-3 rounded-lg transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !showStartModal" class="flex-grow flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>

    <main class="flex-grow p-4 max-w-5xl mx-auto w-full" v-if="!loading && examData && !result && !showStartModal">
        <!-- Section Tabs -->
        <div class="flex space-x-4 mb-6 border-b border-gray-200">
            <button 
                @click="currentSection = 'concept'"
                class="pb-2 px-4 font-medium"
                :class="currentSection === 'concept' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'">
                Concept ({{ examData.concept.length }})
            </button>
            <button 
                 @click="currentSection = 'coding'"
                 class="pb-2 px-4 font-medium"
                 :class="currentSection === 'coding' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'">
                 Implementation ({{ examData.implementation.length }})
            </button>
        </div>

        <!-- Concept Section -->
        <div v-if="currentSection === 'concept'" class="space-y-8">
            <div v-for="(q, idx) in examData.concept" :key="q.id" class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-start">
                    <span class="bg-gray-100 text-gray-600 text-sm font-bold px-2 py-1 rounded mr-3">Q{{ idx + 1 }}</span>
                    <div class="flex-grow">
                        <h3 class="text-lg font-medium mb-2">{{ q.title }}</h3>
                        <p class="text-gray-600 mb-4 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded text-sm">{{ q.code_snippet }}</p>
                        <div class="space-y-2">
                             <label v-for="(opt, oIdx) in q.options" :key="oIdx" class="flex items-center space-x-3 p-2 rounded hover:bg-blue-50 cursor-pointer">
                                 <input type="radio" :name="'q'+q.id" :value="oIdx" v-model="conceptAnswers[q.id]" class="text-blue-600 focus:ring-blue-500">
                                 <span>{{ opt }}</span>
                             </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Coding Section -->
        <div v-if="currentSection === 'coding'" class="space-y-8">
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p class="text-blue-700">For the Mock Exam, please open each problem in a new tab to code and submit. Your submissions are tracked separately.</p>
            </div>
            <div v-for="(q, idx) in examData.implementation" :key="q.id" class="bg-white p-6 rounded-lg shadow">
                 <h3 class="text-lg font-medium mb-2">{{ q.title }}</h3>
                 <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold px-2 py-1 rounded" 
                          :class="{
                            'bg-gray-200': q.difficulty===1,
                            'bg-yellow-100 text-yellow-800': q.difficulty===2,
                            'bg-orange-100 text-orange-800': q.difficulty===3,
                            'bg-red-100 text-red-800': q.difficulty===4
                          }">
                          Level {{ q.difficulty || '?' }}
                    </span>
                 </div>
                 <div class="prose max-w-none text-sm text-gray-500 mb-4 line-clamp-3">
                     {{ q.description.substring(0, 100) }}...
                 </div>
                 <router-link :to="'/problem/' + q.id + '?lang=' + selectedLanguage" target="_blank" class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                     Open Problem Workspace &rarr;
                 </router-link>
            </div>
        </div>
    </main>

    <!-- Result / Report Card -->
    <div v-if="result" class="flex-grow flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
            <h2 class="text-3xl font-bold mb-4">Exam Completed!</h2>
            <div class="text-6xl font-black text-blue-600 mb-2">{{ result.score }} / {{ result.total }}</div>
            <p class="text-gray-500 mb-6">Concept Score</p>
            
            <div class="text-left bg-gray-50 p-4 rounded max-h-60 overflow-y-auto mb-6">
                 <div v-for="d in result.details" :key="d.id" class="flex justify-between py-1 border-b border-gray-100 last:border-0">
                     <span>Question #{{ d.id }}</span>
                     <span :class="d.correct ? 'text-green-600 font-bold' : 'text-red-600'">{{ d.correct ? 'Correct' : 'Incorrect' }}</span>
                 </div>
            </div>

            <button @click="router.push('/')" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">Return Home</button>
        </div>
    </div>
</div>
</template>
