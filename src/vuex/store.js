import Vue from 'vue'
import Vuex from 'vuex'
import ecgView from './modules/ecgView';
import ecgPart from './modules/ecgPart';
import ecgDrag from './modules/ecgDrag';
import homeList from './modules/homeList';
import ecgDayCards from './modules/ecgDayCards';
import PatientEnum from './modules/PatientEnum';
import paperBlock from './modules/paperBlock';
import stayPageState from './modules/stayPageState';
import afView from './modules/afView';
import homeLogoAndTitle from './modules/homeLogoAndTitle';
import superAdminPatientList from './modules/superAdminPatientList';
Vue.use(Vuex)

export default new Vuex.Store({
    modules: {
        ecgView,
        ecgPart,
        ecgDrag,
        ecgDayCards,
        homeList,
        PatientEnum,
        paperBlock,
        afView,
        stayPageState,
        superAdminPatientList,
        homeLogoAndTitle
    },
    state: {},
    mutations: {},
    actions: {}
})
