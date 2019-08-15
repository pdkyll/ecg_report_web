// initial state
// shape: [{ id, quantity }]

const state = {
    selectArray :{
        scatter: [],
        lineBlock: [],
    },
    showPosition: {
        scatter: -5120,
        lineBlock: -5120
    },
    type: ''
};

// getters
const getters = {}

// actions
const actions = {
};

// mutations
const mutations = {
    changeSelected(state, data) {
        state.selectArray[state.type] = data;
    },
    changeType(state, type) {
        state.type = type
    },
    changeshowPosition(state, showPosition) {
        state.showPosition[state.type] = showPosition
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
