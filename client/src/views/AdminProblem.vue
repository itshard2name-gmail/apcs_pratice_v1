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
        message.value = 'AI generated a coding problem for you!'
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
        time_limit: questionData.time_limit || 1000,
        memory_limit: questionData.memory_limit || 256,
        difficulty: questionData.difficulty || 1,
        test_cases: questionData.test_cases || []
    }
    message.value = 'Loaded problem from batch list.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      // Reset form but keep defaults
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
  <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow relative">
    <div class="flex justify-between items-center mb-6">
       <h1 class="text-2xl font-bold">Create Coding Problem</h1>
       <div class="flex gap-2">
           <button 
             @click="openGenModal"
             type="button"
             class="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-purple-700">
             <span>✨ Single AI</span>
           </button>
           <button 
             @click="openBulkModal"
             type="button"
             class="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-indigo-700">
             <span>🚀 Bulk Generate</span>
           </button>
       </div>
    </div>

    <!-- Single AI Modal -->
    <div v-if="showGenModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded shadow-lg w-96">
            <h3 class="font-bold text-lg mb-2">Generate Problem with AI</h3>
            <p class="text-sm text-gray-600 mb-4">Enter a topic (e.g. "Dynamic Programming") and AI will draft a problem.</p>
            <div class="mb-4">
               <label class="block text-sm font-bold mb-1">Topic</label>
               <input v-model="generateTopic" placeholder="e.g. Fibonacci" class="w-full border p-2 rounded" @keyup.enter="generateProblem" />
            </div>
            <div class="mb-4">
               <label class="block text-sm font-bold mb-1">Difficulty</label>
               <select v-model="generateDifficulty" class="w-full border p-2 rounded">
                  <option :value="1">Basic (初級)</option>
                  <option :value="2">Intermediate (中級)</option>
                  <option :value="3">Adv. Inter (中高級)</option>
                  <option :value="4">Advanced (高級)</option>
               </select>
            </div>
            <div class="flex justify-end gap-2">
                <button @click="showGenModal = false" class="text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancel</button>
                <button 
                  @click="generateProblem" 
                  :disabled="generating"
                  class="bg-purple-600 text-white px-4 py-1 rounded font-bold hover:bg-purple-700 disabled:opacity-50">
                  {{ generating ? 'Generating...' : 'Generate' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Bulk AI Modal -->
    <div v-if="showBulkModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded shadow-lg w-96 relative">
            <h3 class="font-bold text-lg mb-2 mr-3">🚀 Bulk Generate Problems</h3>
            
            <div v-if="generating" class="flex flex-col items-center justify-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p class="text-indigo-600 font-bold mb-2">Generating coding problem...</p>
                <p class="text-xs text-gray-500 text-center">Implementation problems generate test cases and descriptions.<br>This may take 15-30 seconds.<br>Please do not close this window.</p>
            </div>

            <div v-else>
                <div class="mb-4">
                    <label class="block text-sm font-bold mb-1">Topic</label>
                    <select v-model="bulkConfig.topic" class="w-full border p-2 rounded mb-2">
                        <option value="">🎲 Random (Mixed Topics)</option>
                        <option v-for="t in TOPIC_OPTIONS_IMPL" :key="t" :value="t">{{ t }}</option>
                        <option value="custom">Other (Manual Entry)</option>
                    </select>
                    <input v-if="bulkConfig.topic === 'custom'" v-model="bulkConfig.customTopic" placeholder="Enter custom topic..." class="w-full border p-2 rounded" />
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-bold mb-1">Difficulty</label>
                     <select v-model="bulkConfig.difficulty" class="w-full border p-2 rounded">
                        <option :value="0">🎲 Random (Mixed)</option>
                        <option :value="1">Basic (初級)</option>
                        <option :value="2">Intermediate (中級)</option>
                        <option :value="3">Adv. Inter (中高級)</option>
                        <option :value="4">Advanced (高級)</option>
                     </select>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold mb-1">Quantity</label>
                    <select v-model="bulkConfig.count" class="w-full border p-2 rounded">
                        <option :value="1">1 Problem</option>
                        <option :value="2">2 Problems</option>
                        <option :value="3">3 Problems (Max)</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Limited to 3 at a time to ensure quality results.</p>
                </div>

                <div class="flex justify-end gap-2">
                    <button @click="showBulkModal = false" class="text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancel</button>
                    <button 
                      @click="generateBatch" 
                      class="bg-indigo-600 text-white px-4 py-1 rounded font-bold hover:bg-indigo-700">
                      Start Generation
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bulk Review Section -->
    <div v-if="generatedList.length > 0" class="mb-8 border-b pb-8">
        <h2 class="text-xl font-bold mb-4 text-indigo-700">Review Batch Generated Problems</h2>
        <div class="grid gap-4">
            <div v-for="(q, idx) in generatedList" :key="idx" class="border p-4 rounded bg-gray-50 flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="bg-gray-200 text-xs px-2 py-0.5 rounded font-mono">{{ idx + 1 }}</span>
                        <h4 class="font-bold text-lg">{{ q.title }}</h4>
                    </div>
                    <!-- Show first 2 lines of description as preview -->
                    <p class="text-sm text-gray-600 line-clamp-2">{{ q.description?.split('\n').slice(0, 3).join(' ') }}...</p>
                    <div class="mt-2 text-xs text-gray-500 flex gap-4">
                        <span>Test Cases: {{ q.test_cases?.length || 0 }}</span>
                        <span class="font-bold text-indigo-600">Level: {{ q.difficulty || '?' }}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2 ml-4">
                    <button 
                        v-if="!q.saved"
                        @click="saveFromBatch(idx)" 
                        class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 whitespace-nowrap">
                        Check & Save
                    </button>
                    <button 
                        v-else 
                        class="bg-gray-400 text-white px-3 py-1 rounded text-sm cursor-not-allowed whitespace-nowrap">
                        Saved ✓
                    </button>
                    
                    <button @click="fillFormFromBatch(idx)" class="text-blue-600 text-sm hover:underline">Edit First</button>
                    <button @click="removeBatchItem(idx)" class="text-red-500 text-sm hover:underline">Discard</button>
                </div>
            </div>
        </div>
    </div>
    
    <div class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Title</label>
            <input v-model="form.title" class="w-full border p-2 rounded" type="text" placeholder="e.g. Sum of Array">
            <div class="mt-2">
                <label class="block text-sm font-medium mb-1">Difficulty Level</label>
                <select v-model="form.difficulty" class="w-full border p-2 rounded bg-white">
                    <option :value="1">Basic (初級)</option>
                    <option :value="2">Intermediate (中級)</option>
                    <option :value="3">Adv. Inter (中高級)</option>
                    <option :value="4">Advanced (高級)</option>
                </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-sm font-medium mb-1">Time (ms)</label>
                <input v-model="form.time_limit" class="w-full border p-2 rounded" type="number">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Memory (MB)</label>
                <input v-model="form.memory_limit" class="w-full border p-2 rounded" type="number">
              </div>
          </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Description (Markdown)</label>
        <textarea v-model="form.description" class="w-full border p-2 rounded font-mono text-sm" rows="10" placeholder="# Problem Description..."></textarea>
      </div>
      
      <div>
        <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium">Test Cases</label>
            <button @click="addTestCase" class="text-sm text-blue-600 hover:underline">+ Add Case</button>
        </div>
        
        <div v-for="(tc, idx) in form.test_cases" :key="idx" class="border p-4 rounded mb-2 bg-gray-50 relative">
          <button @click="removeTestCase(idx)" class="absolute top-2 right-2 text-red-500 text-xs hover:underline" v-if="form.test_cases.length > 1">Remove</button>
          
          <div class="flex items-center gap-2 mb-2">
              <span class="font-bold text-gray-400">#{{ idx + 1 }}</span>
              <label class="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="checkbox" v-model="tc.is_sample">
                  <span>Is Sample Case?</span>
              </label>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
              <div>
                  <label class="text-xs text-gray-500 uppercase">Input</label>
                  <textarea v-model="tc.input" class="w-full border p-1 rounded font-mono text-xs" rows="3"></textarea>
              </div>
              <div>
                  <label class="text-xs text-gray-500 uppercase">Output</label>
                  <textarea v-model="tc.output" class="w-full border p-1 rounded font-mono text-xs" rows="3"></textarea>
              </div>
          </div>
        </div>
      </div>
      
      <div v-if="message" :class="message.includes('Error') ? 'text-red-600' : 'text-green-600'">
        {{ message }}
      </div>
      
      <div class="flex gap-4">
          <button 
            @click="submit" 
            :disabled="submitting"
            class="bg-blue-600 text-white px-8 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
            {{ submitting ? 'Saving...' : 'Create Problem' }}
          </button>
           <router-link to="/problem" class="text-gray-600 py-2">Cancel</router-link>
      </div>
    </div>
  </div>
</template>
