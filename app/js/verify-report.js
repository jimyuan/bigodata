(function($){
  'use strict';
  /*
    render template setting
  */
  var render = Page.compile('basicPanel');

  /*
    data for responed
  */
  var actMsgData;

  /*
    活动验证报表 ajax (API-1)
    获取活动验证报表 API 数据进行第一部分页面渲染
  */
  var actid = Page.request('actid') || 8,
      actMsgUrl = Page.api.verifyInfo,
      actMsgParam = {type: 'GetActMsg', actid: actid};
  $.get(actMsgUrl, actMsgParam)
    .done(function(data){
      actMsgData = data;
      var basicData = actMsgData.data,
          _html   = render['basicPanel']($.extend(basicData, {status: Page.settings.status[basicData.act_status]}));

      $('.container').html(_html);
    });
})(jQuery);
