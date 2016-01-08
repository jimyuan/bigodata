(function($, template){
  'use strict';

  window.Page = {
    settings: {
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
            trigger: 'axis',
            formatter: '{a}<br>{b}: {c}'
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
            data: ccData.values
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
    }

  };
})(jQuery, template);
