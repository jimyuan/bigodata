(function($, template){
  'use strict';

  window.Page = {
    api: {
      mbsInfo: 'http://115.28.83.130:16081/ops_activityreport',
      mbsReport: 'http://115.28.83.130:16081/ops_activityreport',
      verifyInfo: 'data/verify-1.json',
      verifyReport: 'data/verify-2.json'
    },
    settings: {
      // status text
      status: ['暂存','初始','等待','运行','取消','删除','完成','异常','失败','暂停','等待','名单生成完成','等待审核','驳回','批准','等待','执行中','生成中','推送','成功','失败','暂停', '生成中'],

      // suggest default options
      suggest: {
        allowFreeEntries: false,
        maxEntryLength: null,
        maxSelection: 10,
        toggleOnClick: true,
        useTabKey: true,
        useCommaKey: true,
        useZebraStyle: true,
        selectFirst: true,
        disabledField: 'disabled',
        placeholder: '点击选取或输入关键词',
        noSuggestionText: '<i class="text-warning fa fa-exclamation-triangle"></i> 输入有误'
      },
      // 直角坐标系 chart option
      ccOpts: function(ccData) {
        return {
          title: ccData.title || {show: false},
          tooltip: {
            trigger: 'axis'
          },
          toolbox: {
            show: true,
            feature: {
              mark: {show: true},
              magicType: {show: true, type: ['line', 'bar']},
              restore: {show: true},
              saveAsImage: {show: true}
            }
          },
          xAxis : [{
            type: 'category',
            data: ccData.category
          }],
          yAxis: [{
            type: 'value'
          }],
          series: [{
            name: ccData.title.text,
            type: ccData.type || 'line',
            smooth: true,
            itemStyle: {
              normal: {
                areaStyle: {type: 'default'}
              }
            },
            data: ccData.values,
            barMaxWidth: 50
          }]
        }
      },
      pieOpts: function(pieData){
        return {
          title: pieData.title || {show: false},
          tooltip : {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          toolbox: {
            show: true,
            feature: {
              restore: {show: true},
              saveAsImage: {show: true}
            }
          },
          series : [{
            type: 'pie',
            radius: '65%'
          }]
        }
      }
    },

    compile: function(){
      var renderList = {},
          ids = [].slice.call(arguments), _$obj;

      for(var i = 0, x = ids.length; i < x; i++) {
        _$obj = $('#' + ids[i]);
        renderList[ids[i]] = template.compile(_$obj.html());
        _$obj.remove();
      }
      return renderList;
    },

    /*
    获取 url 上指定参数
    */
    request: function(param){
      var reg = new RegExp("(^|&)"+ param +"=([^&]*)(&|$)");
      var r = location.search.substr(1).match(reg);
      return (r !== null) ? decodeURIComponent(r[2]) : null;
    },

    /*
      将格式化形式的数字变成真正的数字
    */
    filterData: function(str){
      var data = str.replace(/,|%/, '');
      data = parseFloat(data);

      return isNaN(data) ? 0 : data;
    },

    upRange: function(data){
      var times, int, float;
      Number.isInteger(data)
        ? (int = data, float = 0)
        : (int = parseInt(data), float = data - int);
      int < 100
        ? times = Math.pow(10, int.toString().length)
        : times = Math.pow(10, int.toString().length - 1);

      return Math.ceil(data / times) * times + float;
    }

  };
})(jQuery, template);
