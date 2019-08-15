// initial state
// shape: [{ id, quantity }]
const state = {
    listArr:[
        // {path: '/doctor/patientList', name: '病人列表'},
    ]
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeShowList(state, data){
        state.listArr = data;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
