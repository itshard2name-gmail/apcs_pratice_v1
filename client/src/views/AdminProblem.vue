<script setup>
import { ref } from 'vue'

const form = ref({
  title: '',
  description: '',
  time_limit: 1000,
  memory_limit: 256,
  difficulty: 1, // 1=Basic, 2=Intermediate, 3=Adv. Inter, 4=Advanced
  test_cases: [
    { input: '', output: '', is_sample: true },
    { input: '', output: '', is_sample: false }
  ]
})

const submitting = ref(false)
const generating = ref(false)
const message = ref('')
const generateTopic = ref('')
const generateDifficulty = ref(1)
const showGenModal = ref(false)

// Bulk Generation State
const showBulkModal = ref(false)
const bulkConfig = ref({
    topic: '', // Empty = Random
    count: 3,
    difficulty: 1
})
const generatedList = ref([]) // Array of questions to review
const TOPIC_OPTIONS_IMPL = [
    "Basic Input/Output",
    "Conditional Logic",
    "Loops & Patterns",
    "Arrays & 2D Arrays",
    "String Manipulation",
    "Recursive Functions",
    "Sorting Algorithms",
    "Searching Algorithms",
    "Greedy Algorithms",
    "Dynamic Programming (Basic)"
]

const addTestCase = () => {
  form.value.test_cases.push({ input: '', output: '', is_sample: false })
}

const removeTestCase = (index) => {
  form.value.test_cases.splice(index, 1)
}

const openGenModal = () => {
  showGenModal.value = true
  generateTopic.value = ''
  generateDifficulty.value = 1
}

const openBulkModal = () => {
    showBulkModal.value = true
    bulkConfig.value = { topic: '', count: 3, difficulty: 1 }
}

const generateProblem = async () => {
    if (!generateTopic.value) return
    generating.value = true
    try {
        const res = await fetch('/api/ai/generate-implementation', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ 
                topic: generateTopic.value,
                difficulty: generateDifficulty.value
            })
        })
        
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}))
           throw new Error(errData.error || res.statusText)
        }

        const data = await res.json()
        
        // Auto-fill form
        form.value.title = data.title
        form.value.description = data.description
        if (data.test_cases) {
            form.value.test_cases = data.test_cases
        }
        showGenModal.value = false
        message.value = '✨ AI generated a coding problem for you!'
        setTimeout(() => message.value = '', 3000)
    } catch (e) {
        alert('AI Generation Failed: ' + e.message)
    } finally {
        generating.value = false
    }
}

const generateBatch = async () => {
    generating.value = true
    try {
        const payload = {
            count: bulkConfig.value.count,
            topic: bulkConfig.value.topic === 'custom' ? bulkConfig.value.customTopic : bulkConfig.value.topic,
            difficulty: bulkConfig.value.difficulty
        }

        const res = await fetch('/api/ai/generate-implementation-batch', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        
        // Add status to each item
        generatedList.value = data.map(q => ({ ...q, saved: false, error: null }))
        showBulkModal.value = false
    } catch (e) {
        alert('Batch Generation Failed: ' + e.message)
    } finally {
        generating.value = false
    }
}

const saveFromBatch = async (index) => {
    const item = generatedList.value[index]
    if (item.saved) return

    try {
        // Prepare payload (add default limits if missing)
        const { saved, error, ...questionData } = item
        const payload = {
            ...questionData,
            time_limit: questionData.time_limit || 1000,
            memory_limit: questionData.memory_limit || 256,
            difficulty: questionData.difficulty || 1 // Use AI projected difficulty or default
        }
        
        const res = await fetch('/api/questions/implementation', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) throw new Error('Failed to save')
        
        generatedList.value[index].saved = true
    } catch (e) {
        generatedList.value[index].error = 'Save failed'
    }
}

const fillFormFromBatch = (index) => {
    const { saved, error, ...questionData } = generatedList.value[index]
    form.value = {
        title: questionData.title || '',
        description: questionData.description || '',
        time_limit: questionData.time_limit || 1000,
        memory_limit: questionData.memory_limit || 256,
        difficulty: questionData.difficulty || 1,
        test_cases: questionData.test_cases || []
    }
    message.value = 'Loaded problem from batch list.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => message.value = '', 3000)
}

const removeBatchItem = (index) => {
    generatedList.value.splice(index, 1)
}

const submit = async () => {
  submitting.value = true
  message.value = ''
  try {
    const res = await fetch('/api/questions/implementation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      message.value = 'Problem created successfully!'
      form.value = {
        title: '',
        description: '',
        time_limit: 1000,
        memory_limit: 256,
        difficulty: 1,
        test_cases: [
            { input: '', output: '', is_sample: true }
        ]
      }
      setTimeout(() => message.value = '', 3000)
    } else {
      message.value = 'Error creating problem'
    }
  } catch (e) {
    message.value = 'Network error'
  } finally {
    submitting.value = false
  }
}
</script>

<template>

  <div class="min-h-screen bg-[#1A1A1A] py-12">
     <!-- Header -->
     <header class="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
            <h1 class="text-3xl font-bold text-white">Problem Admin</h1>
            <p class="text-gray-400 mt-1">Manage coding challenges and test cases.</p>
        </div>
        <div class="flex gap-3">
             <button 
              @click="openGenModal"
              type="button"
              class="bg-purple-600 text-white px-5 py-2.5 rounded-lg shadow-sm font-bold flex items-center gap-2 hover:bg-purple-700 hover:shadow-md transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <span>Single AI Gen</span>
            </button>
            <button 
              @click="openBulkModal"
              type="button"
              class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm font-bold flex items-center gap-2 hover:bg-indigo-700 hover:shadow-md transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              <span>Bulk Generate</span>
            </button>
        </div>
     </header>

     <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-6 lg:px-8">
        
        <!-- Main Edit Form (Left 2/3) -->
        <div class="lg:col-span-2 space-y-8">
             <div class="bg-[#252526] rounded-xl shadow-sm border border-[#333] p-8">
                 <div class="mb-6 flex items-center justify-between">
                     <h2 class="text-xl font-bold text-white">Editor</h2>
                     <span v-if="message" class="text-sm font-medium px-3 py-1 rounded-full animate-fade"
                         :class="message.includes('Error') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'">
                         {{ message }}
                     </span>
                 </div>
                 
                 <div class="space-y-6">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label class="block text-sm font-bold text-gray-300 mb-2">Problem Title</label>
                            <input v-model="form.title" class="w-full border-[#333] rounded-lg p-3 bg-[#1e1e1e] text-white focus:bg-[#1e1e1e] focus:ring-2 focus:ring-blue-500 transition-all border outline-none" type="text" placeholder="e.g. Binary Search">
                          </div>
                           <div>
                            <label class="block text-sm font-bold text-gray-300 mb-2">Difficulty</label>
                             <select v-model="form.difficulty" class="w-full border-[#333] rounded-lg p-3 bg-[#1e1e1e] text-white focus:bg-[#1e1e1e] focus:ring-2 focus:ring-blue-500 transition-all border outline-none">
                                <option :value="1">Basic (初級)</option>
                                <option :value="2">Intermediate (中級)</option>
                                <option :value="3">Adv. Inter (中高級)</option>
                                <option :value="4">Advanced (高級)</option>
                            </select>
                          </div>
                      </div>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label class="block text-sm font-bold text-gray-300 mb-2">Time Limit (ms)</label>
                            <input v-model="form.time_limit" class="w-full border-[#333] rounded-lg p-3 bg-[#1e1e1e] text-white focus:bg-[#1e1e1e] focus:ring-2 focus:ring-blue-500 transition-all border outline-none" type="number">
                          </div>
                           <div>
                            <label class="block text-sm font-bold text-gray-300 mb-2">Memory Limit (MB)</label>
                            <input v-model="form.memory_limit" class="w-full border-[#333] rounded-lg p-3 bg-[#1e1e1e] text-white focus:bg-[#1e1e1e] focus:ring-2 focus:ring-blue-500 transition-all border outline-none" type="number">
                          </div>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-bold text-gray-300 mb-2">Problem Description (Markdown)</label>
                        <textarea v-model="form.description" class="w-full border-[#333] rounded-lg p-3 bg-[#1e1e1e] text-white focus:bg-[#1e1e1e] focus:ring-2 focus:ring-blue-500 transition-all border outline-none font-mono text-sm" rows="8" placeholder="# Description..."></textarea>
                      </div>

                      <!-- Test Cases -->
                      <div>
                          <div class="flex justify-between items-center mb-4">
                              <label class="block text-sm font-bold text-gray-300">Test Cases</label>
                              <button @click="addTestCase" class="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-900/50 uppercase tracking-wide transition-colors">+ Add Case</button>
                          </div>
                          
                          <div class="space-y-4">
                              <div v-for="(tc, idx) in form.test_cases" :key="idx" class="border border-[#333] rounded-xl p-4 bg-[#1e1e1e] relative group hover:bg-[#2d2d2d] hover:shadow-sm transition-all">
                                  <button @click="removeTestCase(idx)" class="absolute top-2 right-2 text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity" v-if="form.test_cases.length > 1">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                  </button>
                                  
                                  <div class="flex items-center gap-3 mb-3">
                                      <span class="bg-[#333] text-gray-400 text-xs font-bold px-2 py-0.5 rounded">Case #{{ idx + 1 }}</span>
                                      <label class="flex items-center gap-2 cursor-pointer select-none">
                                          <input type="checkbox" v-model="tc.is_sample" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-600 bg-[#333]">
                                          <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Public Sample?</span>
                                      </label>
                                  </div>
                                  
                                  <div class="grid grid-cols-2 gap-4">
                                      <div>
                                          <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Input</label>
                                          <textarea v-model="tc.input" class="w-full border-[#333] rounded p-2 text-xs font-mono bg-[#252526] text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none" rows="3"></textarea>
                                      </div>
                                      <div>
                                          <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Output</label>
                                          <textarea v-model="tc.output" class="w-full border-[#333] rounded p-2 text-xs font-mono bg-[#252526] text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none" rows="3"></textarea>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                 </div>
                 
                 <div class="mt-8 flex justify-end gap-4 border-t border-[#333] pt-6">
                      <router-link to="/problem" class="px-6 py-2.5 rounded-lg text-gray-400 hover:bg-[#333] font-bold transition-colors">Cancel</router-link>
                      <button 
                        @click="submit" 
                        :disabled="submitting"
                        class="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ submitting ? 'Saving...' : 'Create Problem' }}
                      </button>
                 </div>
             </div>
        </div>

        <!-- Sidebar / Batch List (Right 1/3) -->
        <div class="space-y-8">
            <div v-if="generatedList.length > 0" class="bg-[#252526] rounded-xl shadow-sm border border-[#333] p-6 sticky top-24">
                 <div class="flex items-center justify-between mb-4">
                     <h3 class="text-lg font-bold text-white">Batch Review</h3>
                     <span class="bg-indigo-900/30 text-indigo-400 font-bold px-2 py-0.5 rounded-full text-xs">{{ generatedList.length }} Items</span>
                 </div>
                 
                 <div class="max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                     <div v-for="(q, idx) in generatedList" :key="idx" class="p-3 rounded-lg border border-[#333] bg-[#1e1e1e] hover:border-indigo-500/50 transition-colors group">
                         <div class="flex justify-between items-start mb-2">
                             <div class="text-xs font-bold text-gray-500 uppercase">#{{ idx + 1 }}</div>
                             <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button @click="fillFormFromBatch(idx)" class="text-blue-400 hover:text-blue-300" title="Edit">
                                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                 </button>
                                 <button @click="removeBatchItem(idx)" class="text-red-400 hover:text-red-300" title="Discard">
                                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                 </button>
                             </div>
                         </div>
                         <h4 class="font-bold text-white text-sm mb-1 line-clamp-1">{{ q.title }}</h4>
                         <p class="text-gray-400 text-xs line-clamp-2 mb-2">{{ q.description }}</p>

                         <div class="flex gap-2 mb-3">
                              <span class="px-1.5 py-0.5 rounded bg-[#333] text-gray-400 text-[10px] font-bold">L{{ q.difficulty || 1 }}</span>
                              <span class="px-1.5 py-0.5 rounded bg-[#333] text-gray-400 text-[10px] font-bold">{{ q.test_cases?.length || 0 }} Cases</span>
                         </div>
                         
                         <button 
                             v-if="!q.saved"
                             @click="saveFromBatch(idx)"
                             class="w-full py-1.5 rounded text-xs font-bold bg-[#333] border border-green-900 text-green-400 hover:bg-[#2d2d2d]">
                             Quick Save
                         </button>
                         <div v-else class="w-full py-1.5 rounded text-xs font-bold bg-green-900/30 text-green-400 text-center">
                             Saved ✓
                         </div>
                     </div>
                 </div>
            </div>

            <div v-else class="bg-[#252526] rounded-xl border-2 border-dashed border-[#333] p-8 text-center ml-2">
                <div class="text-4xl mb-2">🚀</div>
                <h3 class="text-gray-300 font-bold mb-1">No Batch Items</h3>
                <p class="text-gray-500 text-sm">Use "Bulk Generate" to create multiple questions at once.</p>
            </div>
        </div>
     </div>

     <!-- Modals -->
     
    <!-- Single AI Modal -->
    <div v-if="showGenModal" class="fixed inset-0 bg-[#000] bg-opacity-90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div class="bg-[#252526] rounded-2xl shadow-xl max-w-sm w-full p-6 border border-[#333]">
            <h3 class="font-bold text-xl mb-2 text-white">✨ AI Generator</h3>
            <p class="text-sm text-gray-400 mb-4">Draft a coding problem from a topic.</p>
            
            <div class="space-y-4 mb-6">
                <div>
                   <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Topic</label>
                   <input v-model="generateTopic" placeholder="e.g. Tree Traversal" class="w-full border border-[#333] bg-[#1e1e1e] text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" @keyup.enter="generateProblem" />
                </div>
                <div>
                   <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Difficulty</label>
                   <select v-model="generateDifficulty" class="w-full border border-[#333] bg-[#1e1e1e] text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500">
                      <option :value="1">Basic (初級)</option>
                      <option :value="2">Intermediate (中級)</option>
                      <option :value="3">Adv. Inter (中高級)</option>
                      <option :value="4">Advanced (高級)</option>
                   </select>
                </div>
            </div>

            <div class="flex justify-end gap-2">
                <button @click="showGenModal = false" class="text-gray-400 px-4 py-2 font-bold hover:bg-[#333] rounded-lg">Cancel</button>
                <button 
                  @click="generateProblem" 
                  :disabled="generating"
                  class="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-500/30">
                  {{ generating ? 'Thinking...' : 'Generate' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Bulk AI Modal -->
    <div v-if="showBulkModal" class="fixed inset-0 bg-[#000] bg-opacity-90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div class="bg-[#252526] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-[#333]" v-if="generating">
             <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4 mx-auto"></div>
             <p class="text-indigo-400 font-bold mb-1">Writing Problems...</p>
             <p class="text-xs text-gray-400">Generating test cases takes a bit longer.<br>Please wait.</p>
        </div>

        <div class="bg-[#252526] rounded-2xl shadow-xl max-w-sm w-full p-6 border border-[#333]" v-else>
            <h3 class="font-bold text-xl mb-4 text-white flex items-center gap-2">
                <span>🚀 Batch Generator</span>
            </h3>
            
            <div class="mb-4 text-left">
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Topic</label>
                <select v-model="bulkConfig.topic" class="w-full border border-[#333] bg-[#1e1e1e] text-white p-3 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">🎲 Random (Mixed Topics)</option>
                    <option v-for="t in TOPIC_OPTIONS_IMPL" :key="t" :value="t">{{ t }}</option>
                    <option value="custom">Other (Manual Entry)</option>
                </select>
                <input v-if="bulkConfig.topic === 'custom'" v-model="bulkConfig.customTopic" placeholder="Enter custom topic..." class="w-full border border-[#333] bg-[#1e1e1e] text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div class="mb-4 text-left">
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Difficulty</label>
                <select v-model="bulkConfig.difficulty" class="w-full border border-[#333] bg-[#1e1e1e] text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                    <option :value="0">🎲 Random (Mixed)</option>
                    <option :value="1">Basic (初級)</option>
                    <option :value="2">Intermediate (中級)</option>
                    <option :value="3">Adv. Inter (中高級)</option>
                    <option :value="4">Advanced (高級)</option>
                 </select>
            </div>

            <div class="mb-6 text-left">
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Quantity</label>
                <div class="grid grid-cols-3 gap-2">
                    <button 
                        v-for="num in [1, 2, 3]" :key="num"
                        @click="bulkConfig.count = num"
                        :class="bulkConfig.count === num ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#1e1e1e] text-gray-400 hover:bg-[#333]'"
                        class="p-2 rounded-lg font-bold text-sm transition-all">
                        {{ num }}
                    </button>
                </div>
                 <p class="text-xs text-gray-400 mt-2">Max 3 for complex problems.</p>
            </div>

            <div class="flex justify-end gap-2">
                <button @click="showBulkModal = false" class="text-gray-400 px-4 py-2 font-bold hover:bg-[#333] rounded-lg">Cancel</button>
                <button 
                  @click="generateBatch" 
                  class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">
                  Start Generation
                </button>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563; 
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280; 
}
</style>
