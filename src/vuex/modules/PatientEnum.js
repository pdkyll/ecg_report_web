
// 0: 未标注  1：待审核  2：已审核  3:驳回
const state = {
    unaudit:0,
    auditing:1,
    audited:2,
    rejected:3,
    auditText:[
        '未标注' , '待审核' , '已审核' , '被驳回'
    ]
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
