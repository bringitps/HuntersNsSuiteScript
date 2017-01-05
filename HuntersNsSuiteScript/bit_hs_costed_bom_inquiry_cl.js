/*
 * 	Author: Bring IT Devs
 *	Version: 1.0
 *	Date: 12/21/2016
 * 	Bring IT Custom SuiteLet Script added by Edgar Beltrán
 *	This Script builds a Custom Costed BOM Inquiry Report 
 *	this collects information from 2 sources (NS Standard Report & nlapiSearchRecord)
 */ 

//This function will refresh IFrame with NS Standard Report data
//IFrame gets refreshed once Location and Item are selected
function onFieldChange(type, name, linenum)
{
	if(name == 'custpage_location')
		nlapiSetFieldValue('custpage_subsidiary', isEmpty(nlapiGetFieldValue('custpage_location')) ? '' : nlapiLookupField('location', nlapiGetFieldValue('custpage_location'),'subsidiary'), false);
	
	if(name == 'custpage_item')
		nlapiSetFieldValue('custpage_uom', isEmpty(nlapiGetFieldValue('custpage_item')) ? '': nlapiLookupField('assemblyitem', nlapiGetFieldValue('custpage_item'),'unitstype', true), false);
	
	if(notEmpty(nlapiGetFieldValue('custpage_location')) && notEmpty(nlapiGetFieldValue('custpage_item')))
		document.getElementById("iframeNetSuiteStandardReportData").src= '/app/accounting/transactions/manufacturing/costedbillofmaterialslist.nl?report=T&toplevelonly=' + nlapiGetFieldValue('custpage_top_level') + '&trandate=' + nlapiGetFieldValue('custpage_date') + '&location=' + nlapiGetFieldValue('custpage_location') + '&assemblyitem=' + nlapiGetFieldValue('custpage_item') + '&revision=';
}

//This function builds and exports a file with CSV content extracted from Custom HTML Report table 
function exportCsv()
{
	
	var customCostedBOMInquiryReportHtmlBodyTable = document.getElementById("tblCustomCostedBOMInquiry");
	if ( typeof(customCostedBOMInquiryReportHtmlBodyTable) !== "undefined" && customCostedBOMInquiryReportHtmlBodyTable !== null )
	{
		var csvContent = '';	
		for(var i=0; i<customCostedBOMInquiryReportHtmlBodyTable.rows.length; i++)
		{
			for(var j=0; j<customCostedBOMInquiryReportHtmlBodyTable.rows[i].cells.length; j++)
			{
				var cellContent = customCostedBOMInquiryReportHtmlBodyTable.rows[i].cells[j];
				var cellText = String(cellContent.innerHTML).replace('&nbsp;', '').replace('&amp;', '&').replace('&quot;', '"') ;
				
				if(i==0 || j==0)
					cellText = (cellContent.textContent || cellContent.innerText || "");
				
				csvContent += '"' + cellText + '",';
			}
			csvContent += '\n';
		}
		
		var tmpElement = document.createElement('a');
		tmpElement.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
		tmpElement.setAttribute('download', 'Costed Bill of Materials Inquiry.csv');

		tmpElement.style.display = 'none';
		document.body.appendChild(tmpElement);

		tmpElement.click();
		document.body.removeChild(tmpElement);
	}
}

//This function collects and merge data to build an HTML Table
function buildCustomReport() 
{ 
	nlapiSetFieldValue('custpage_report', '<br><p>Loading...</p>', false);
	
	//--- Start Step 1: Load Data ---//
	
	//Data source #1
	//Load Costed BOM Inquiry Report into Frame to get Standard Calculations
	//This NS Standard Page is being used as a Service for this solution
	
	var iframeNsReport = document.getElementById("iframeNetSuiteStandardReportData");
	var iframeNsReportInnerDoc = iframeNsReport.contentDocument || iframeNsReport.contentWindow.document;
	var NsReportHtmlBodyTable = iframeNsReportInnerDoc.getElementById("div__bodytab");
	

	if(NsReportHtmlBodyTable.rows[0].cells[0].innerHTML.trim() == 'No records to show.')
	{
		nlapiSetFieldValue('custpage_report', '<br><p><b>No records to show.</b></p>', false);
		return;
	}
	
	var NsReportColumnNames = new Array();
	for(var i=0; i<NsReportHtmlBodyTable.rows[0].cells.length; i++)
		NsReportColumnNames.push(NsReportHtmlBodyTable.rows[0].cells[i].innerHTML);
	
	var NsReportRowValues = new Array();
	for(var i=1; i<NsReportHtmlBodyTable.rows.length; i++)
	{
		var nsReportCellValues = new Array();
		for(var j=0; j<NsReportHtmlBodyTable.rows[i].cells.length; j++)
			nsReportCellValues.push(NsReportHtmlBodyTable.rows[i].cells[j].innerHTML);
		
		NsReportRowValues.push(nsReportCellValues);
	}
	
	
	//Data source #2
	//BOM using Saved Search to get Quantity On Hand, Available, Back Ordered, On Order
	var itemBomObj = getItemBomObj(nlapiGetFieldValue('custpage_item'), nlapiGetFieldValue('custpage_location'), 1);

	//--- End Step 1 ---//
	
	
	
	//--- Start Step 2: Merge information retrieved from NS Standard Report and nlapiSearchRecord ---//
	
	//This tricky part will determine BOM Levels based on margin property assigned by NS Standard Report
	var marginLeftValues = new Array();
	
	var itemColumnString = '';
	for(var i=1; i<NsReportHtmlBodyTable.rows.length; i++)
	{
		if(notEmpty(NsReportHtmlBodyTable.rows[i].cells[0].innerHTML))
		{
			var marginLeftValue = NsReportHtmlBodyTable.rows[i].cells[0].innerHTML.match(/\bstyle=(['"])(.*?)\1/gi);//.substring(7, matches[i].length - 1).split(':')[1];
			marginLeftValue = (marginLeftValue + '').substring(7, (marginLeftValue + '').length - 1).split(':')[1];
			
			if(typeof(marginLeftValue) !='undefined' && notEmpty(marginLeftValue))
			{
				if(marginLeftValues.indexOf(Number(marginLeftValue.replace(/\D/g,''))) == -1)
					marginLeftValues.push(Number(marginLeftValue.replace(/\D/g,'')));
			}
		}
	}

	//Sorting to determine proper BOM Level
	marginLeftValues.sort(function(a,b){return a - b})
	
	//Add additional information to original report
	
	//Adding BOM Component Level
	NsReportColumnNames.splice(1, 0, 'Level');
	for(var i=0; i<NsReportRowValues.length; i++)
	{
		if(notEmpty(NsReportRowValues[i][0]))
		{
			var marginLeftValue = NsReportRowValues[i][0].match(/\bstyle=(['"])(.*?)\1/gi);
			marginLeftValue = (marginLeftValue + '').substring(7, (marginLeftValue + '').length - 1).split(':')[1];
			
			if(typeof(marginLeftValue) !='undefined' && notEmpty(marginLeftValue))
			{
				if(marginLeftValues.indexOf(Number(marginLeftValue.replace(/\D/g,''))) > -1)
				{
					var bomLevel = marginLeftValues.indexOf(Number(marginLeftValue.replace(/\D/g,''))) + 1;
					NsReportRowValues[i].splice(1, 0, bomLevel.toString());
				}
				else
					NsReportRowValues[i].splice(1, 0, '&nbsp;');
			}
			else
				NsReportRowValues[i].splice(1, 0, '&nbsp;');
		}
	}
	
	//Building a Matrix of data in order to avoid many loops to get Information
	var itemNameMtx = new Array();
	var itemNameBomLevelMtx = new Array();
	var itemParentItemNameMtx = new Array();
	var itemBomLevelMtx = new Array();
	var itemDescriptionMtx = new Array();
	var itemQtyOnHandMtx = new Array();
	var itemQtyAvailableMtx = new Array();
	var itemQtyBackOrderedMtx = new Array();
	var itemQtyOnOrderMtx = new Array();
	for(var i=0; i<itemBomObj.bomComponentLines.length; i++)
	{
		itemNameMtx.push(itemBomObj.bomComponentLines[i].itemName);
		itemNameBomLevelMtx.push(itemBomObj.bomComponentLines[i].itemName + '_' + itemBomObj.bomComponentLines[i].levelBOM);
		itemParentItemNameMtx.push(itemBomObj.bomComponentLines[i].parentItemName);
		itemBomLevelMtx.push(itemBomObj.bomComponentLines[i].levelBOM);
		itemDescriptionMtx.push(itemBomObj.bomComponentLines[i].itemDescription);
		itemQtyOnHandMtx.push(itemBomObj.bomComponentLines[i].locationQtyOnHand);
		itemQtyAvailableMtx.push(itemBomObj.bomComponentLines[i].locationQtyAvailable);
		itemQtyBackOrderedMtx.push(itemBomObj.bomComponentLines[i].locationQtyBackOrdered);
		itemQtyOnOrderMtx.push(itemBomObj.bomComponentLines[i].locationQtyOnOrder);
	}

	//Adding Item Description
	NsReportColumnNames.splice(1, 0, 'Description');
	for(var i=0; i<NsReportRowValues.length; i++)
	{
		if(notEmpty(NsReportRowValues[i][0]))
		{
			//Remove HMTL Tags to get Item Name
			var tempDiv = document.createElement("div");
			tempDiv.innerHTML = NsReportRowValues[i][0];
			
			var itemQtyMtxIndex = itemNameMtx.indexOf((tempDiv.textContent || tempDiv.innerText || ""));
			if(itemQtyMtxIndex > -1)
				NsReportRowValues[i].splice(1, 0, itemDescriptionMtx[itemQtyMtxIndex]);
			else
				NsReportRowValues[i].splice(1, 0, '');
		}
	}
	
	//Adding Location Quantities 
	NsReportColumnNames.splice(NsReportColumnNames.length - 1, 0, 'On Hand');
	NsReportColumnNames.splice(NsReportColumnNames.length - 1, 0, 'Available');
	NsReportColumnNames.splice(NsReportColumnNames.length - 1, 0, 'Back Ordered');
	NsReportColumnNames.splice(NsReportColumnNames.length - 1, 0, 'On Order');
	for(var i=0; i<NsReportRowValues.length; i++)
	{
		if(notEmpty(NsReportRowValues[i][0]))
		{
			//Remove HMTL Tags to get Item Name
			var tempDiv = document.createElement("div");
			tempDiv.innerHTML = NsReportRowValues[i][0];
			
			var itemQtyMtxIndex = itemNameMtx.indexOf((tempDiv.textContent || tempDiv.innerText || ""));
			if(itemQtyMtxIndex > -1)
			{
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, itemQtyOnHandMtx[itemQtyMtxIndex]);
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, itemQtyAvailableMtx[itemQtyMtxIndex]);
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, itemQtyBackOrderedMtx[itemQtyMtxIndex]);
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, itemQtyOnOrderMtx[itemQtyMtxIndex]);
			}
			else
			{
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, '0');
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, '0');
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, '0');
				NsReportRowValues[i].splice(NsReportRowValues[i].length -1, 0, '0');
			}
		}
	}
	
	//--- End Step 2 ---//
	
	
	
	//--- Start Step 3: Build & Display HTML Report ---//
	
	//Identify Parent Items to Sort HTML Table Rows
	
	
	var reportHTML = '<br>';
	reportHTML +=	'<table id="tblCustomCostedBOMInquiry" border="1" style="width:1300px; border-collapse:collapse;">';
	reportHTML +=		'<tr>';
	
	for(var i=0; i<NsReportColumnNames.length; i++)
	{
		if(i<=1)
			reportHTML +=	'<td bgcolor="#BDBDBD" style="width:150px;"><b>' + NsReportColumnNames[i].toUpperCase() + '</b></td>';
		else
			reportHTML +=	'<td bgcolor="#BDBDBD" style="width:65px;"><b>' + NsReportColumnNames[i].toUpperCase() + '</b></td>';
	}
	
	reportHTML +=			'</tr>';
	
	//Array with Cells of HTML Table Row
	var htmlTableRowItemNameMtx = new Array();
	var htmlTableRowItemNameBomLevelMtx = new Array();
	var htmlTableRowCellsMtx = new Array();
	
	for(var i=0; i<NsReportRowValues.length-1; i++)
	{
		//Remove HMTL Tags to get Item Name
		var tempDiv = document.createElement("div");
		tempDiv.innerHTML = NsReportRowValues[i][0];
		var itemName = tempDiv.textContent || tempDiv.innerText || "";
		htmlTableRowItemNameMtx.push(itemName);
		htmlTableRowItemNameBomLevelMtx.push(itemName + '_' + NsReportRowValues[i][2]);
		
		var htmlTableRow =	'<tr>';
		
		for(var j=0; j<NsReportRowValues[i].length; j++)
		{
			if(j<=1)
				htmlTableRow +=	'<td style="width:150px;">' + NsReportRowValues[i][j] + '</td>';
			else
				htmlTableRow +=	'<td align="right">' +  (isNaN(NsReportRowValues[i][j]) ? NsReportRowValues[i][j] : parseFloat(Number(NsReportRowValues[i][j]).toFixed(8))) + '</td>';
		}
		
		htmlTableRow +=	'</tr>';
		htmlTableRowCellsMtx.push(htmlTableRow);
	}
	
	//Sort by Parent Items + BOM Levels
	var sortedHtmlTableRows = new Array();
	var sortedHtmlTableRowItemNameBomLevel = new Array();
	for(var i=0; i<itemNameBomLevelMtx.length; i++)
	{
		var htmlTableRowCellIndex = htmlTableRowItemNameBomLevelMtx.indexOf(itemNameBomLevelMtx[i]);
		if(htmlTableRowCellIndex != -1)
		{
			//Look for a Parent Item to Sort
			if(itemBomLevelMtx[i] > 1 && notEmpty(itemParentItemNameMtx[i]))
			{
				var parentItemSortedHtmlTableRowIndex = sortedHtmlTableRowItemNameBomLevel.indexOf(itemParentItemNameMtx[i] + '_' + (itemBomLevelMtx[i]-1));
				sortedHtmlTableRows.splice(parentItemSortedHtmlTableRowIndex + 1, 0, htmlTableRowCellsMtx[htmlTableRowCellIndex]);
				sortedHtmlTableRowItemNameBomLevel.splice(parentItemSortedHtmlTableRowIndex + 1, 0, htmlTableRowItemNameBomLevelMtx[htmlTableRowCellIndex]);
			}
			else
			{
				sortedHtmlTableRows.push(htmlTableRowCellsMtx[htmlTableRowCellIndex]);
				sortedHtmlTableRowItemNameBomLevel.push(htmlTableRowItemNameBomLevelMtx[htmlTableRowCellIndex]);
			}
		}
	}
	
	for(var i=0; i<sortedHtmlTableRows.length; i++)
		reportHTML += sortedHtmlTableRows[i];
	
	reportHTML +=	'</table>';
	reportHTML +=	'<br><br>';
	
	nlapiSetFieldValue('custpage_report', reportHTML, false);
	
	//--- End Step 3 ---//	
}


//This function gets Bill Of Materials for Specified Item
//It also includes Inventory Snapshot for Specified Location
function getItemBomObj(topItemId, inventoryLocationId, topQty)
{

	var itemBomObj = new Object();
	itemBomObj.itemId = topItemId;
	itemBomObj.locationId = inventoryLocationId;

	var bomItemIdMtx = new Array();
	bomItemIdMtx.push(parseInt(topItemId));

	var bomItemQtyMtx = new Array();
	bomItemQtyMtx.push(parseFloat(topQty));
	
	var itemBomLines = new Array();

	var levelBOM = 1;
	var srItemBOM = getChildBomComponents(bomItemIdMtx, itemBomObj.locationId);
	while(notEmpty(srItemBOM) && srItemBOM.length >0)
	{
		var processingBomItemIdMtx = bomItemIdMtx.slice();
		var processingBomItemQtyMtx = bomItemQtyMtx.slice();
		bomItemIdMtx = new Array();
		bomItemQtyMtx = new Array();
		
		for(var i=0; i<srItemBOM.length; i++)
		{
			var itemBomLineObj = new Object();
			itemBomLineObj.levelBOM = levelBOM;
			itemBomLineObj.parentItemId = parseInt(srItemBOM[i].getValue('internalid'));
			itemBomLineObj.parentItemName = srItemBOM[i].getValue('itemid');
			itemBomLineObj.itemId = srItemBOM[i].getValue('memberitem'); 
			itemBomLineObj.itemName = srItemBOM[i].getText('memberitem'); 
			itemBomLineObj.itemDescription = srItemBOM[i].getValue('description', 'memberitem');
			itemBomLineObj.itemUnitCost = parseFloat(notEmpty(srItemBOM[i].getValue('locationcost', 'memberitem')) ? srItemBOM[i].getValue('locationcost', 'memberitem') : 0); 
			itemBomLineObj.locationQtyOnHand = parseFloat(notEmpty(srItemBOM[i].getValue('locationquantityonhand', 'memberitem')) ? srItemBOM[i].getValue('locationquantityonhand', 'memberitem') : 0); 
			itemBomLineObj.locationQtyAvailable = parseFloat(notEmpty(srItemBOM[i].getValue('locationquantityavailable', 'memberitem')) ? srItemBOM[i].getValue('locationquantityavailable', 'memberitem') : 0); 
			itemBomLineObj.locationQtyBackOrdered = parseFloat(notEmpty(srItemBOM[i].getValue('locationquantitybackordered', 'memberitem')) ? srItemBOM[i].getValue('locationquantitybackordered', 'memberitem') : 0); 
			itemBomLineObj.locationQtyOnOrder = parseFloat(notEmpty(srItemBOM[i].getValue('locationquantityonorder', 'memberitem')) ? srItemBOM[i].getValue('locationquantityonorder', 'memberitem') : 0); 
			
			var processingBomItemIndex = processingBomItemIdMtx.indexOf(itemBomLineObj.parentItemId);
			var parentBomQuantity = processingBomItemQtyMtx[processingBomItemIndex];
			
			itemBomLineObj.assemblyQuantity = parseFloat(notEmpty(srItemBOM[i].getValue('memberquantity')) ? parseFloat(srItemBOM[i].getValue('memberquantity')) : 1);
			itemBomLineObj.bomQuantity = parseFloat(parentBomQuantity) * itemBomLineObj.assemblyQuantity;
			itemBomLineObj.bomCost = itemBomLineObj.bomQuantity * itemBomLineObj.itemUnitCost;
			
			//Rounding
			itemBomLineObj.itemUnitCost = parseFloat(itemBomLineObj.itemUnitCost).toFixed(8); 
			itemBomLineObj.assemblyQuantity = parseFloat(itemBomLineObj.assemblyQuantity).toFixed(8);
			itemBomLineObj.bomQuantity = parseFloat(itemBomLineObj.bomQuantity).toFixed(8);
			itemBomLineObj.bomCost = parseFloat(itemBomLineObj.bomCost).toFixed(8); 
			
			itemBomLines.push(itemBomLineObj);
			
			if(srItemBOM[i].getValue('type','memberitem') == 'Assembly')
			{
				bomItemIdMtx.push(parseInt(itemBomLineObj.itemId));
				bomItemQtyMtx.push(itemBomLineObj.bomQuantity);
			}
		}
		
		levelBOM++;
		if(bomItemIdMtx.length >0)
			srItemBOM = getChildBomComponents(bomItemIdMtx, itemBomObj.locationId);
		else
			break;
	}
	
	itemBomObj.bomComponentLines = itemBomLines;
	return itemBomObj;
}


//This function gets the list of Child Components for a Specified List of Items
function getChildBomComponents(itemList, locationId)
{
	var filterBomExpression = 
			[
				[
	 	 			['internalid', 'anyOf', itemList], 
	 	 			'and',
	 	 			['inventorylocation', 'is', locationId],
	 	 			'and',
					['memberitem.type', 'anyOf', ['InvtPart','Assembly']],
					'and',
	 	 			['memberitem.inventorylocation', 'is', locationId]
	 	 		],
				'or',
				[	['internalid', 'anyOf', itemList], 
		 			'and',
		 			['inventorylocation', 'isempty', null],
		 			'and',
					['memberitem.type', 'noneOf', ['InvtPart','Assembly']],
					'and',
		 			['memberitem.inventorylocation', 'isempty', null]
		 		]
			];
	
	
	var columnBomItem = new Array();
	columnBomItem.push(new nlobjSearchColumn('internalid'));
	columnBomItem.push(new nlobjSearchColumn('itemid'));
	columnBomItem.push(new nlobjSearchColumn('memberitem'));
	columnBomItem.push(new nlobjSearchColumn('memberquantity'));
	columnBomItem.push(new nlobjSearchColumn('description', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('cost', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('locationcost', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationquantityonhand', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationquantityavailable', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('locationquantitybackordered', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationquantityonorder', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('type', 'memberitem'));

	return nlapiSearchRecord('item', null, filterBomExpression, columnBomItem);

}


//--- General Javascript Functions ---//

function isEmpty(val) {
	return (val == null || val == '' || val == 'null');
}
function notEmpty(tmp) {
	return !isEmpty(tmp);
}