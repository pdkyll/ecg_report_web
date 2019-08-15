// 0: 未标注  1：待审核  2：已审核  3:驳回
const state = {
    savePage: 0,
    saveFilters: null
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changePage(state, page) {
        state.savePage = page;
    },
    changeFilters(state, filters) {
        state.saveFilters = filters;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
