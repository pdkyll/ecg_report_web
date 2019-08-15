import * as API from './'

export default {
    loadOverlayData(report_id, params) {
        return API.PUT(`/overlay/load/${report_id}`, params);
    },
    getSlotImage(report_id, slot) {
        return API.GET(`/overlay/image/${report_id}/${slot}`);
    },
    movementOverlay(report_id, params) {
        return API.PUT(`/overlay/movement/${report_id}`, params);
    },
    getSlotBeats(report_id, slot) {
        return API.GET(`/overlay/positions/${report_id}/${slot}`);
    },
    deleteOverlayPart(report_id, slot, params) {
        return API.PUT(`/overlay/remove/${report_id}/${slot}`, params);
    }
}