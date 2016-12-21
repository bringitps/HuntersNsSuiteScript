/*
 * 	Author: Bring IT Devs
 *	Version: 1.0
 *	Date: 12/21/2016
 * 	Bring IT Custom SuiteLet Script added by Edgar Beltrán
 *	This Script builds a Custom Costed BOM Inquiry form 
 */ 

function buildCostedBomInquiryForm(request, response) 
{
	var form = nlapiCreateForm('Custom Costed Bill of Materials Inquiry');
	form.setScript('customscript_bit_hs_cost_bom_inquiry_cl');

	form.addButton('custpage_btn_export', 'Export to CSV', 'exportCsv()'); //Client will write CSV file      
	var filterGroup = form.addFieldGroup('custpage_filter_group', 'Available Filters');
	form.addField('custpage_location', 'select', 'Location', 'location', 'custpage_filter_group').setMandatory(true);
	form.addField('custpage_subsidiary', 'text', 'Subsidiary', null, 'custpage_filter_group').setDisplayType('inline');
	form.addField('custpage_item', 'select', 'Assembly', 'assemblyitem', 'custpage_filter_group').setMandatory(true);
	form.addField('custpage_uom', 'text', 'Unit Of Measure', null, 'custpage_filter_group').setDisplayType('inline');

	form.addField('custpage_top_level', 'checkbox', 'Top Level Only', null, 'custpage_filter_group').setBreakType('startcol');
	var selectBomControl = form.addField('custpage_bom_control', 'select', 'Bom Display Control', null, 'custpage_filter_group').setDisplayType('disabled');
	selectBomControl.addSelectOption('By Date','By Date', true); 
	form.addField('custpage_date', 'date', 'Date', null, 'custpage_filter_group');

	var filterGroup = form.addFieldGroup('custpage_report_group', 'Results');
	var csvReportContent = form.addField('custpage_csv_content', 'textarea', null, null, 'custpage_report_group').setDisplayType('hidden');
	var resultsReportHTML = form.addField('custpage_report', 'inlinehtml', null, null, 'custpage_report_group');
	var NsReportIframeHTML = form.addField('custpage_div', 'inlinehtml', null, null, 'custpage_report_group');

	resultsReportHTML.setDefaultValue('<div id="divResultsReport" name="divResultsReport"></div>');

	NsReportIframeHTML.setDefaultValue('<iframe id="iframeNetSuiteStandardReportData" name="iframeNetSuiteStandardReportData" onload="this.width=0;this.height=0;buildCustomReport();" style="visibility:hidden"></iframe>');
	response.writePage(form);
}