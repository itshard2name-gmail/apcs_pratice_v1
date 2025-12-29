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
<div class="min-h-screen bg-[#1A1A1A] flex flex-col font-sans">
    <!-- Header with Timer -->
    <header v-if="!showStartModal && !result" class="bg-[#1e1e1e] shadow sticky top-0 z-20 border-b border-[#333]">
        <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div class="flex items-center gap-4">
                <span class="font-bold text-white text-lg tracking-tight">APCS Mock Exam</span>
                <span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide" 
                    :class="selectedDifficulty > 0 ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'">
                    {{ selectedDifficulty > 0 ? `Level ${selectedDifficulty}` : 'Mixed Level' }}
                </span>
            </div>
            
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-2 bg-[#252526] px-4 py-2 rounded-lg border border-[#333]">
                    <span class="text-sm font-bold text-gray-400 uppercase">Time Remaining</span>
                    <span class="text-xl font-mono font-bold" :class="timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'">
                        {{ formattedTime }}
                    </span>
                </div>
                
                <button 
                    @click="submitExam" 
                    class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
                    Finish Exam
                </button>
            </div>
        </div>
    </header>

    <!-- Start Exam Modal -->
    <div v-if="showStartModal" class="fixed inset-0 bg-[#000] bg-opacity-90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div class="bg-[#252526] rounded-2xl shadow-2xl max-w-lg w-full p-10 relative overflow-hidden border border-[#333]">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-blue-600"></div>
            
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-[#444]">📝</div>
                <h2 class="text-3xl font-bold text-white mb-2">Start Mock Exam</h2>
                <p class="text-gray-400 text-lg">2.5 Hours • Full Simulation</p>
            </div>
            
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-bold mb-2 text-gray-300 flex items-center gap-2">
                        <span>Select Difficulty</span>
                        <span class="text-xs font-normal text-gray-500 bg-[#333] px-2 rounded">Optional</span>
                    </label>
                    <select v-model="selectedDifficulty" class="w-full border border-[#333] p-4 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none bg-[#1e1e1e] text-white transition-all cursor-pointer hover:bg-[#2d2d2d]">
                         <option :value="0">🎲 Mixed (Random Levels)</option>
                         <option :value="1">Level 1: Basic (初級)</option>
                         <option :value="2">Level 2: Intermediate (中級)</option>
                         <option :value="3">Level 3: Adv. Intermediate (中高級)</option>
                         <option :value="4">Level 4: Advanced (高級)</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-bold mb-2 text-gray-300">Programming Language</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button 
                            v-for="lang in ['c', 'cpp', 'java', 'python']" 
                            :key="lang"
                            @click="selectedLanguage = lang"
                            type="button"
                            :class="[
                                'p-3 rounded-lg border font-medium uppercase text-sm transition-all',
                                selectedLanguage === lang 
                                    ? 'border-blue-500 bg-blue-900/20 text-blue-400 ring-2 ring-blue-500/20' 
                                    : 'border-[#333] text-gray-400 hover:border-gray-500 hover:bg-[#333]'
                            ]"
                        >
                            {{ lang === 'cpp' ? 'C++' : lang }}
                        </button>
                    </div>
                </div>
                
                <div class="pt-4 flex gap-4">
                    <button 
                        @click="router.push('/')"
                        class="flex-1 text-gray-500 hover:text-gray-700 font-bold py-4 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        @click="startExam" 
                        :disabled="loading"
                        class="flex-[2] bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex justify-center items-center">
                        <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white border-b-transparent rounded-full mr-2"></span>
                        {{ loading ? 'Preparing...' : 'Start Exam' }}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !showStartModal" class="flex-grow flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600 mb-4"></div>
        <p class="text-gray-500 font-medium">Generating Exam Paper...</p>
    </div>

    <main class="flex-grow p-6 max-w-6xl mx-auto w-full" v-if="!loading && examData && !result && !showStartModal">
        <!-- Section Tabs -->
        <div class="flex justify-center mb-8">
            <div class="bg-[#252526] p-1 rounded-xl shadow-sm border border-[#333] inline-flex">
                <button 
                    @click="currentSection = 'concept'"
                    class="px-8 py-2.5 rounded-lg text-sm font-bold transition-all"
                    :class="currentSection === 'concept' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#333]'">
                    Concept Questions <span class="ml-2 opacity-75 text-xs bg-white/20 px-1.5 rounded-full inline-block">{{ examData.concept.length }}</span>
                </button>
                <button 
                     @click="currentSection = 'coding'"
                     class="px-8 py-2.5 rounded-lg text-sm font-bold transition-all"
                     :class="currentSection === 'coding' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#333]'">
                     Implementation Problems <span class="ml-2 opacity-75 text-xs bg-white/20 px-1.5 rounded-full inline-block">{{ examData.implementation.length }}</span>
                </button>
            </div>
        </div>

        <!-- Concept Section -->
        <div v-if="currentSection === 'concept'" class="space-y-6">
            <div v-for="(q, idx) in examData.concept" :key="q.id" class="bg-[#252526] p-8 rounded-xl shadow-sm border border-[#333]">
                <div class="flex items-start">
                    <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#333] text-gray-400 font-bold rounded-lg text-sm mr-4 mt-1">
                        {{ idx + 1 }}
                    </div>
                    <div class="flex-grow">
                        <h3 class="text-lg font-bold text-white mb-3">{{ q.title }}</h3>
                        <div class="text-gray-300 mb-4 whitespace-pre-wrap leading-relaxed">{{ q.content }}</div>
                        <p v-if="q.code_snippet" class="text-gray-400 mb-6 bg-[#1e1e1e] p-4 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap border border-[#333]">{{ q.code_snippet }}</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <label v-for="(opt, oIdx) in q.options" :key="oIdx" 
                                class="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all group"
                                :class="conceptAnswers[q.id] === oIdx ? 'border-blue-500 bg-blue-900/20 ring-1 ring-blue-500' : 'border-[#333] hover:border-blue-500/50 hover:bg-[#2d2d2d]'">
                                 <input type="radio" :name="'q'+q.id" :value="oIdx" v-model="conceptAnswers[q.id]" class="text-blue-600 focus:ring-blue-500 h-4 w-4">
                                 <span class="font-medium group-hover:text-white" :class="conceptAnswers[q.id] === oIdx ? 'text-blue-400' : 'text-gray-400'">{{ opt }}</span>
                             </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Coding Section -->
        <div v-if="currentSection === 'coding'" class="space-y-6">
            <div class="bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8 flex items-start gap-4">
                <svg class="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                   <h4 class="font-bold text-blue-400 mb-1">Instructions</h4>
                   <p class="text-blue-300 text-sm">Please open each problem in a new tab to code and submit. Your submissions are tracked separately by the system.</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div v-for="(q, idx) in examData.implementation" :key="q.id" class="bg-[#252526] p-6 rounded-xl shadow-sm border border-[#333] flex flex-col hover:shadow-md transition-shadow">
                     <div class="flex justify-between items-start mb-4">
                         <span class="bg-[#333] text-gray-400 text-xs font-bold px-2 py-1 rounded">Problem {{ idx + 1 }}</span>
                         <span class="text-xs font-bold px-2 py-1 rounded uppercase tracking-wider" 
                               :class="{
                                 'bg-green-900/30 text-green-400 border border-green-900/50': q.difficulty===1,
                                 'bg-blue-900/30 text-blue-400 border border-blue-900/50': q.difficulty===2,
                                 'bg-orange-900/30 text-orange-400 border border-orange-900/50': q.difficulty===3,
                                 'bg-red-900/30 text-red-400 border border-red-900/50': q.difficulty===4
                               }">
                               Level {{ q.difficulty || '?' }}
                         </span>
                     </div>
                     
                     <h3 class="text-xl font-bold text-white mb-2">{{ q.title }}</h3>
                     
                     <div class="text-sm text-gray-400 mb-6 line-clamp-2">{{ q.description }}</div>
                     
                     <router-link :to="'/problem/' + q.id + '?lang=' + selectedLanguage + '&mode=exam'" target="_blank" 
                        class="mt-auto w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors">
                         Open Workspace
                         <svg class="ml-2 -mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                     </router-link>
                </div>
            </div>
        </div>
    </main>

    <!-- Result / Report Card -->
    <div v-if="result" class="flex-grow flex items-center justify-center p-4 bg-[#1A1A1A]">
        <div class="bg-[#252526] p-10 rounded-2xl shadow-xl max-w-2xl w-full text-center border border-[#333]">
            <div class="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl border border-green-900/50">🏆</div>
            <h2 class="text-3xl font-bold mb-2 text-white">Exam Completed!</h2>
            <p class="text-gray-400 mb-8">Here is your performance summary.</p>
            
            <div class="flex justify-center items-end gap-2 mb-8">
                <span class="text-6xl font-black text-blue-500">{{ result.score }}</span>
                <span class="text-2xl font-medium text-gray-500 mb-2">/ {{ result.total }}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-8">
                 <div class="bg-[#1e1e1e] p-4 rounded-xl border border-[#333]">
                      <div class="text-sm text-gray-500 font-bold uppercase mb-1">Concept Score</div>
                      <div class="text-xl font-bold text-white">{{ result.score }} pts</div>
                 </div>
                 <div class="bg-[#1e1e1e] p-4 rounded-xl border border-[#333]">
                      <div class="text-sm text-gray-500 font-bold uppercase mb-1">Total Questions</div>
                      <div class="text-xl font-bold text-white">{{ result.details.length }}</div>
                 </div>
            </div>
            
            <h3 class="text-left font-bold text-white mb-4">Detailed Report</h3>
            <div class="text-left bg-[#1e1e1e] rounded-xl overflow-hidden border border-[#333] mb-8 max-h-60 overflow-y-auto custom-scrollbar">
                 <div v-for="d in result.details" :key="d.id" class="flex justify-between items-center p-4 border-b border-[#333] last:border-0 hover:bg-[#2d2d2d] transition-colors">
                     <span class="font-medium text-gray-300">Question #{{ d.id }}</span>
                     <span :class="['px-2 py-1 rounded text-xs font-bold uppercase', d.correct ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50']">
                         {{ d.correct ? 'Correct' : 'Incorrect' }}
                     </span>
                 </div>
            </div>

            <button @click="router.push('/')" class="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all">Return to Home</button>
        </div>
    </div>
</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563; 
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280; 
}
</style>
