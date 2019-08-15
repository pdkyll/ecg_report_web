<template>
<div>
<el-row type="flex" class="row-bg" justify="space-between">
</el-row>
<el-row type="flex" class="row-bg" justify="space-around">
  <el-col :span="4"><div class="grid-content bg-purple">
      <span>报告总数 &nbsp;&nbsp;&nbsp; <strong class="grid-content-strong">{{data.record}}</strong>份</span>
      </div></el-col>
  <el-col :span="4"><div class="grid-content bg-purple">
      <span>医生总数 &nbsp;&nbsp;&nbsp; <strong class="grid-content-strong">{{data.doctor}}</strong>人 </span>
      </div></el-col>
  <el-col :span="4"><div class="grid-content bg-purple">
      <span>分析中 &nbsp;&nbsp;&nbsp; <strong class="grid-content-strong">{{data.editing}}</strong>条 </span>
      </div></el-col>
  <el-col :span="4"><div class="grid-content bg-purple">
      <span>审核中 &nbsp;&nbsp;&nbsp; <strong class="grid-content-strong">{{data.auditing}}</strong>条 </span>
      </div></el-col>
  <el-col :span="4"><div class="grid-content bg-purple">
      <span>已完成 &nbsp;&nbsp;&nbsp; <strong class="grid-content-strong">{{data.finish}}</strong>条 </span>
      </div></el-col>
</el-row>
</div>
</template>
<script>
import API from "../../api/api_user";

export default {
  name: "StaticsTitle",
  data() {
    return {
      data: {},
    };
  },
  methods: {
    handleStaticsData() {
      let that = this;
      API.titleStataics().then(function(result) {
        if (result) {
            that.data = result;
          // that.data.patientCount = result.record;
          // that.data.doctorCount = result.doctor;
          // that.data.uploadCount = result.record;
          // that.data.finishCount = result.record_finished;
          // that.data.publishCount = result.record_published;
          // that.testData = result.record_published;
        }
      });
    }
  },
  mounted() {
    this.handleStaticsData();
  }
};
</script>

<style scoped>
.el-row {
  margin-bottom: 20px;
  /* &:last-child {
    margin-bottom: 0;
  } */
}
.el-col {
  border-radius: 4px;
}
.bg-purple-dark {
  background: #99a9bf;
}
.bg-purple {
  background: #72b2f9;
}
.bg-purple-light {
  background: #72b2f9;
}
.grid-content {
  border-radius: 4px;
  min-height: 48px;
  line-height: 48px;
  text-align: center;
}

.grid-content-strong {
  font-size: 35px;
}
.row-bg {
  padding: 10px 0;
  background-color: #f9fafc;
}
</style>