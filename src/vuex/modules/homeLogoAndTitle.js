// initial state
// shape: [{ id, quantity }]
const state = {
    logo: localStorage.getItem('logo'),
    title: localStorage.getItem('title')
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    setLogo(state, logo) {
        state.logo = logo;
    },
    setTitle(state, title) {
        state.title = title;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
