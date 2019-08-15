import * as API from './';

export default {
    viewAgencyList: params => {
        return API.GET('/hospital/', params)
    },
    deleteAgency: (params, institutionId) => {
        let url = `/institutions/${institutionId}`;
        return API.DELETE(url, params)
    },
    createNewAgency: params => {
        return API.POST('/institutions', params);
    },
    getNotifications: params => {
        return API.GET('/notifications/', params);
    },
    emitNotification: params => {
        return API.POST('/notifications/', params);
    },
    deleteNotification: params => {
        return API.DELETE('/notifications/', params);
    },
    getDoctors: params => {
        return API.GET('/user/doctorManager/', params);
    },
    getRecentNotication: params => {
        return API.GET('/notifications/mine/', params);
    },
    confirmNoticication: params => {
        return API.GET('/notifications/confirm/', params)
    },
    getInsititutionInfo: (params, institutionId) => {
        let url = `/institutions/${institutionId}`;
        return API.GET(url, params);
    },
    resetPwd: params => {
        return API.GET('/user/resetPassword/', params);
    },
    getHospitals: (params, institutionId) => {
        let url = `/hospital/${institutionId}`;
        return API.GET(url, params);
    },
}