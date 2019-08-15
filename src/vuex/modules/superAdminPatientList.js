// 0: 未标注  1：待审核  2：已审核  3:驳回
const state = {
    currentPageIndex: 1,
    selectRowIndex: -1,
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeCurrentPageIndex(state, pageIndex) {
        state.currentPageIndex = pageIndex;
    },
    changeSelectRowIndex(state, rowIndex) {
        state.selectRowIndex = rowIndex;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
