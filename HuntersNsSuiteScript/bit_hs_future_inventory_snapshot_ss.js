/*
 * 	Author: Bring IT Devs
 *	Version: 1.0
 *	Date: 12/23/2016
 * 	Bring IT Custom SuiteLet Script added by Edgar Beltrán
 *	This Script builds a report that displays 
 *	what the current on hand inventory position will be at specified date in the future.   
 */ 
 
function buildFutureInventorySnapshotReport()
{
	//Execution handling vars
	var executionContext = nlapiGetContext();
	var memoryUsageOverflowControl = false;
	
	//Replace by Script Parameters
	
	var locationId = executionContext.getSetting('SCRIPT','custscript_bit_hs_location'); 
	var locationName = nlapiLookupField('location', locationId, 'name');
	var nsFolderId = executionContext.getSetting('SCRIPT','custscript_bit_hs_folder_id');
	var endDate = executionContext.getSetting('SCRIPT','custscript_bit_hs_due_date');
	var generatedByUserId = executionContext.getSetting('SCRIPT','custscript_bit_hs_report_generated_by');
	var reportStatus = executionContext.getSetting('SCRIPT','custscript_bit_hs_report_status');
	var reportFileId = executionContext.getSetting('SCRIPT','custscript_bit_hs_report_file_id');
	var futureInventorySnapshotRecordId = executionContext.getSetting('SCRIPT','custscript_bit_hs_future_inv_snap_record');
	var lastAssemblyId = executionContext.getSetting('SCRIPT','custscript_bit_hs_last_assembly_id');
	
	nlapiLogExecution('audit', 'Starting', 'Execution Parameters: locationId=' + locationId +', nsFolderId=' + nsFolderId +', endDate='+ endDate +', reportStatus=' + reportStatus +', reportFileId=' + reportFileId +',futureInventorySnapshotRecordId=' + futureInventorySnapshotRecordId + ', lastAssemblyId=' + lastAssemblyId + ', generatedByUserId=' + generatedByUserId);
	
	var futureInventorySnapshotRecord = null;
	if(notEmpty(futureInventorySnapshotRecordId))
		futureInventorySnapshotRecord = nlapiLoadRecord('customrecord_bit_hs_future_inv_snapshot', futureInventorySnapshotRecordId);
	else
		futureInventorySnapshotRecord = nlapiCreateRecord('customrecord_bit_hs_future_inv_snapshot');
		
	futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_location', locationId);
	futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_due_date', endDate);
	futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_report_status', 'In Progress');
	futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_generated_by', generatedByUserId);
	futureInventorySnapshotRecordId = nlapiSubmitRecord(futureInventorySnapshotRecord);
	

	var csvContentMtx = new Array();
	
	if(notEmpty(lastAssemblyId) && notEmpty(reportFileId))
	{
		var nsReportFile = nlapiLoadFile(reportFileId);
		var nsReportFileCsvContent = nsReportFile.getValue();
		csvContentMtx = nsReportFileCsvContent.split('\r\n');
	}

	
	//--- Step 1 of 5. Load Assembly Items  ---//
	nlapiLogExecution('audit', 'Step 1 of 6', 'Load Assembly Items');
	
	//Matrix of Data for Assembly Items
	var assemblyItemIdMtx = new Array();
	var assemblyItemNameMtx = new Array();
	var assemblyItemDescriptionMtx = new Array();
	var assemblyItemLocationQtyOnHandMtx = new Array();
	var assemblyItemLocationQtyAvailableMtx = new Array();
	var assemblyItemLocationQtyBackorderedMtx = new Array(); 
	var assemblyItemLocationQtyOnOrderMtx = new Array();
	var assemblyItemLocationCostMtx = new Array();
	var assemblyItemLocationAverageCostMtx = new Array();
	var assemblyItemSupplyQuantityMtx = new Array();
	var assemblyItemDemandQuantityMtx = new Array();
	var assemblyItemForecastQuantityMtx = new Array();
	var assemblyItemAnalizedMtx = new Array();
	
	var srAssemblyItems = new Array();
	
	if(notEmpty(lastAssemblyId))
	{
		getAssemblyItems(srAssemblyItems, lastAssemblyId, locationId);
		
		//Load already processed assemblies from CSV
		for(var i=1; i<csvContentMtx.length; i++)
		{
			var csvColumnValues = csvContentMtx[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
			csvColumnValues = csvColumnValues || [];
			
			//Removing quotes of String using Slice function
			if(notEmpty(csvColumnValues[1]) && csvColumnValues[1].slice(1, -1) == 'Assembly')
			{
				assemblyItemIdMtx.push(csvColumnValues[0].slice(1, -1));
				assemblyItemNameMtx.push(csvColumnValues[2].slice(1, -1));
				assemblyItemDescriptionMtx.push(csvColumnValues[3].slice(1, -1));
				assemblyItemLocationQtyOnHandMtx.push(parseFloat(notEmpty(csvColumnValues[6]) ? csvColumnValues[6].slice(1, -1) : 0));
				assemblyItemLocationQtyAvailableMtx.push(parseFloat(notEmpty(csvColumnValues[7]) ? csvColumnValues[7].slice(1, -1) : 0));
				assemblyItemLocationQtyBackorderedMtx.push(parseFloat(notEmpty(csvColumnValues[8]) ? csvColumnValues[8].slice(1, -1) : 0)); 
				assemblyItemLocationQtyOnOrderMtx.push(parseFloat(notEmpty(csvColumnValues[9]) ? csvColumnValues[9].slice(1, -1) : 0));
				assemblyItemLocationCostMtx.push(parseFloat(notEmpty(csvColumnValues[10]) ? csvColumnValues[10].slice(1, -1) : 0));
				assemblyItemLocationAverageCostMtx.push(parseFloat(notEmpty(csvColumnValues[11]) ? csvColumnValues[11].slice(1, -1) : 0));
				assemblyItemSupplyQuantityMtx.push(parseFloat(notEmpty(csvColumnValues[12]) ? csvColumnValues[12].slice(1, -1) : 0));
				assemblyItemDemandQuantityMtx.push(parseFloat(notEmpty(csvColumnValues[13]) ? csvColumnValues[13].slice(1, -1) : 0));
				assemblyItemForecastQuantityMtx.push(parseFloat(notEmpty(csvColumnValues[14]) ? csvColumnValues[14].slice(1, -1) : 0));
				assemblyItemAnalizedMtx.push(true);
			}
		}
	}
	else
		getAssemblyItems(srAssemblyItems, -1, locationId);
	
	for(var i=0; i<srAssemblyItems.length; i++)
	{
		for(var j=0; j<srAssemblyItems[i].length; j++)
		{	
			assemblyItemIdMtx.push(srAssemblyItems[i][j].getId());
			assemblyItemNameMtx.push(srAssemblyItems[i][j].getValue('itemid'));
			assemblyItemDescriptionMtx.push(srAssemblyItems[i][j].getValue('description'));
			assemblyItemLocationQtyOnHandMtx.push(notEmpty(srAssemblyItems[i][j].getValue('locationquantityonhand')) ? srAssemblyItems[i][j].getValue('locationquantityonhand') : 0);
			assemblyItemLocationQtyAvailableMtx.push(notEmpty(srAssemblyItems[i][j].getValue('locationquantityavailable')) ? srAssemblyItems[i][j].getValue('locationquantityavailable') : 0);
			assemblyItemLocationQtyBackorderedMtx.push(notEmpty(srAssemblyItems[i][j].getValue('locationquantitybackordered')) ? srAssemblyItems[i][j].getValue('locationquantitybackordered') : 0);
			assemblyItemLocationQtyOnOrderMtx.push(notEmpty(srAssemblyItems[i][j].getValue('locationquantityonorder')) ? srAssemblyItems[i][j].getValue('locationquantityonorder') : 0);
			assemblyItemLocationCostMtx.push(notEmpty(srAssemblyItems[i][j].getValue('locationcost')) ? srAssemblyItems[i][j].getValue('locationcost') : 0);
			assemblyItemLocationAverageCostMtx.push(notEmpty(srAssemblyItems[i][j].getValue('locationaveragecost')) ? srAssemblyItems[i][j].getValue('locationaveragecost') : 0);
			assemblyItemSupplyQuantityMtx.push(0);
			assemblyItemDemandQuantityMtx.push(0);
			assemblyItemForecastQuantityMtx.push(0);
			assemblyItemAnalizedMtx.push(false);
		}
	}
	
	//--- Step 2 of 6. Get Supply Report (Open Purchase Orders) ---//
	nlapiLogExecution('audit', 'Step 2 of 6', 'Get Supply Report (Open Purchase Orders)');
	
	var supplyItemIdMtx = new Array();
	var supplyItemOpenQtyMtx = new Array();
	
	var srSupplyReport = new Array();
	getPlannedPurchaseOrdersSr(srSupplyReport, -1, locationId, 'T', null, 'F', null, null, null, null);
	
	for(var i=0; i<srSupplyReport.length; i++)
	{
		for(var j=0; j<srSupplyReport[i].length; j++)
		{
			var lineQty = notEmpty(srSupplyReport[i][j].getValue('quantity')) ? parseFloat(srSupplyReport[i][j].getValue('quantity')) : 0;
			var lineRecvQty = notEmpty(srSupplyReport[i][j].getValue('quantityshiprecv')) ? parseFloat(srSupplyReport[i][j].getValue('quantityshiprecv')) : 0;
			
			if((lineQty - lineRecvQty) > 0)
			{
				var supplyItemIndex = supplyItemIdMtx.indexOf(srSupplyReport[i][j].getValue('item'));
				if(supplyItemIndex == -1)
				{
					supplyItemIdMtx.push(srSupplyReport[i][j].getValue('item'));
					supplyItemOpenQtyMtx.push(lineQty - lineRecvQty);
				}
				else
					supplyItemOpenQtyMtx[supplyItemIndex] = parseFloat(supplyItemOpenQtyMtx[supplyItemIndex]) + parseFloat(lineQty - lineRecvQty);
			}
		}
	}
	
	//--- Step 3 of 6. Get Demand Report (Open Sales Orders) ---//
	nlapiLogExecution('audit', 'Step 3 of 6', 'Get Demand Report (Open Sales Orders)');
	
	var demandItemIdMtx = new Array();
	var demandItemOpenQtyMtx = new Array();
	
	var srDemandReport = new Array();
	getSalesOrderDemandSr(srDemandReport, -1, locationId, 'T', null, 'F', null, null, null, null);
	
	for(var i=0; i<srDemandReport.length; i++)
	{
		for(var j=0; j<srDemandReport[i].length; j++)
		{
			var lineQty = notEmpty(srDemandReport[i][j].getValue('quantity')) ? parseFloat(srDemandReport[i][j].getValue('quantity')) : 0;
			var lineShipQty = notEmpty(srDemandReport[i][j].getValue('quantityshiprecv')) ? parseFloat(srDemandReport[i][j].getValue('quantityshiprecv')) : 0;
			
			if((lineQty - lineShipQty) > 0)
			{
				var demandItemIndex = demandItemIdMtx.indexOf(srDemandReport[i][j].getValue('item'));
				if(demandItemIndex == -1)
				{
					demandItemIdMtx.push(srDemandReport[i][j].getValue('item'));
					demandItemOpenQtyMtx.push(lineQty - lineShipQty);
				}
				else
					demandItemOpenQtyMtx[demandItemIndex] = parseFloat(demandItemOpenQtyMtx[demandItemIndex]) + parseFloat(lineQty - lineShipQty);
			}
		}
	}
	
	//--- Step 4 of 6. Get Forecast Report (Custom Record) ---//
	nlapiLogExecution('audit', 'Step 4 of 6', 'Get Forecast Report (Custom Record)');
	
	
	//Matrix of Data
	var forecastItemIdMtx = new Array();
	var forecastQtyMtx = new Array();
	
	var srForecast = new Array();
	getForecastData(srForecast, -1, locationId, endDate);
	
	for(var i=0; i<srForecast.length; i++)
	{
		for(var j=0; j<srForecast[i].length; j++)
		{
			var forecastMtxIndex = forecastItemIdMtx.indexOf(srForecast[i][j].getValue('custrecord_forecast_item'));
			
			if(forecastMtxIndex == -1)
			{
				forecastItemIdMtx.push(srForecast[i][j].getValue('custrecord_forecast_item'));
				forecastQtyMtx.push(parseFloat(srForecast[i][j].getValue('custrecord_forecast_qty')));
			}
			else
				forecastQtyMtx[forecastMtxIndex] = parseFloat(forecastQtyMtx[forecastMtxIndex]) +  parseFloat(srForecast[i][j].getValue('custrecord_forecast_qty'));
		}
	}
	
	
	
	//--- Step 5 of 6. Get BOM Components of Assembly Items ---//
	nlapiLogExecution('audit', 'Step 5 of 6', 'Get BOM Components of Assembly Items and merge Information');
	
	
	//Matrix of Data for Component Items (Buy)
	var buyItemIdMtx = new Array();
	var buyItemNameMtx = new Array();
	var buyItemDescriptionMtx = new Array();
	var buyItemUnitCostMtx = new Array();
	var buyItemLocationQtyOnHandMtx = new Array();
	var buyItemLocationQtyAvailableMtx = new Array();
	var buyItemLocationQtyBackorderedMtx = new Array(); 
	var buyItemLocationQtyOnOrderMtx = new Array();
	var buyItemLocationCostMtx = new Array();
	var buyItemLocationAverageCostMtx = new Array();
	var buyItemSupplyQuantityMtx = new Array();
	var buyItemDemandQuantityMtx = new Array();
	var buyItemForecastQuantityMtx = new Array();
	
	if(notEmpty(lastAssemblyId))
	{
		//Load already processed Inventory Items from CSV
		for(var i=1; i<csvContentMtx.length; i++)
		{
			var csvColumnValues = csvContentMtx[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
			csvColumnValues = csvColumnValues || [];
			
			//Removing quotes of String using Slice function
			if(notEmpty(csvColumnValues[1]) && csvColumnValues[1].slice(1, -1) == 'Inventory Item')
			{	
				buyItemIdMtx.push(csvColumnValues[0].slice(1, -1));
				buyItemNameMtx.push(csvColumnValues[2].slice(1, -1));
				buyItemDescriptionMtx.push(csvColumnValues[3].slice(1, -1));
				buyItemUnitCostMtx(parseFloat(notEmpty(csvColumnValues[4]) ? csvColumnValues[4].slice(1, -1) : 0));
				buyItemLocationQtyOnHandMtx.push(parseFloat(notEmpty(csvColumnValues[6]) ? csvColumnValues[6].slice(1, -1) : 0));
				buyItemLocationQtyAvailableMtx.push(parseFloat(notEmpty(csvColumnValues[7]) ? csvColumnValues[7].slice(1, -1) : 0));
				buyItemLocationQtyBackorderedMtx.push(parseFloat(notEmpty(csvColumnValues[8]) ? csvColumnValues[8].slice(1, -1) : 0)); 
				buyItemLocationQtyOnOrderMtx.push(parseFloat(notEmpty(csvColumnValues[9]) ? csvColumnValues[9].slice(1, -1) : 0));
				buyItemLocationCostMtx.push(parseFloat(notEmpty(csvColumnValues[10]) ? csvColumnValues[10].slice(1, -1) : 0));
				buyItemLocationAverageCostMtx.push(parseFloat(notEmpty(csvColumnValues[11]) ? csvColumnValues[11].slice(1, -1) : 0));
				buyItemSupplyQuantityMtx.push(parseFloat(notEmpty(csvColumnValues[12]) ? csvColumnValues[12].slice(1, -1) : 0));
				buyItemDemandQuantityMtx.push(parseFloat(notEmpty(csvColumnValues[13]) ? csvColumnValues[13].slice(1, -1) : 0));
				buyItemForecastQuantityMtx.push(parseFloat(notEmpty(csvColumnValues[14]) ? csvColumnValues[14].slice(1, -1) : 0));
			}
		}
	}
	
	for(var i=0; i<assemblyItemIdMtx.length; i++)
	{
		nlapiLogExecution('audit', 'Step 5 of 6', 'Processing Assembly ' + (i+1) + ' of ' + assemblyItemIdMtx.length);
		
		if(notEmpty(futureInventorySnapshotRecordId))
			nlapiSubmitField('customrecord_bit_hs_future_inv_snapshot', futureInventorySnapshotRecordId, 'custrecord_bit_hs_report_status', 'In Progress. ' + ('Processing Assembly ' + (i+1) + ' of ' + assemblyItemIdMtx.length));
		
		var assemblyItemId = assemblyItemIdMtx[i];
		
		if(executionContext.getRemainingUsage() <= 100)
		{
			lastAssemblyId = assemblyItemId;
			memoryUsageOverflowControl = true;
			break;
		}
		
		var assemblyItemDemandQty = 0;
		var demandAssemblyItemIndex = demandItemIdMtx.indexOf(assemblyItemId);
		if(demandAssemblyItemIndex > -1)
		{
			assemblyItemDemandQty = demandItemOpenQtyMtx[demandAssemblyItemIndex];
			assemblyItemDemandQuantityMtx[i] = assemblyItemDemandQty;
		}
		
		var supplyAssemblyItemIndex = supplyItemIdMtx.indexOf(assemblyItemId);
		if(supplyAssemblyItemIndex > -1)
		{
			assemblyItemSupplyQty = supplyItemOpenQtyMtx[supplyAssemblyItemIndex];
			assemblyItemSupplyQuantityMtx[i] = assemblyItemSupplyQty;
		}
		
		var assemblyItemForecastIndex = forecastItemIdMtx.indexOf(assemblyItemId);
		if(assemblyItemForecastIndex > -1) 
		{
			var assemblyItemForecastQty = forecastQtyMtx[assemblyItemForecastIndex];
			assemblyItemForecastQuantityMtx[i] = assemblyItemForecastQty;
		}
		
		var assemblyItemBomObj = getItemBomObj(assemblyItemId, locationId, 1);
		
		
		for(var j=0; j<assemblyItemBomObj.bomComponentLines.length; j++)
		{
			var buyItemIndex = buyItemIdMtx.indexOf(assemblyItemBomObj.bomComponentLines[j].itemId);
			
			if(assemblyItemBomObj.bomComponentLines[j].itemType == 'InvtPart')
			{
				if(buyItemIndex == -1)
				{
					buyItemIdMtx.push(assemblyItemBomObj.bomComponentLines[j].itemId);
					buyItemNameMtx.push(assemblyItemBomObj.bomComponentLines[j].itemName);
					buyItemDescriptionMtx.push(assemblyItemBomObj.bomComponentLines[j].itemDescription);
					buyItemUnitCostMtx.push(assemblyItemBomObj.bomComponentLines[j].itemUnitCost);
					buyItemLocationQtyOnHandMtx.push(assemblyItemBomObj.bomComponentLines[j].locationQtyOnHand);
					buyItemLocationQtyAvailableMtx.push(assemblyItemBomObj.bomComponentLines[j].locationQtyAvailable);
					buyItemLocationQtyBackorderedMtx.push(assemblyItemBomObj.bomComponentLines[j].locationQtyBackOrdered); 
					buyItemLocationQtyOnOrderMtx.push(assemblyItemBomObj.bomComponentLines[j].locationQtyOnOrder);
					buyItemLocationCostMtx.push(assemblyItemBomObj.bomComponentLines[j].locationCost);
					buyItemLocationAverageCostMtx.push(assemblyItemBomObj.bomComponentLines[j].locationAverageCost);
					
					buyItemSupplyQuantityMtx.push(0);
					var supplyItemIndex = supplyItemIdMtx.indexOf(assemblyItemBomObj.bomComponentLines[j].itemId);
					if(supplyItemIndex > -1)
						buyItemSupplyQuantityMtx[buyItemSupplyQuantityMtx.length -1] = supplyItemOpenQtyMtx[supplyItemIndex];
					
					buyItemDemandQuantityMtx.push(0);
					if(assemblyItemDemandQty > 0)
						buyItemDemandQuantityMtx[buyItemDemandQuantityMtx.length -1] = parseFloat(assemblyItemDemandQty) * parseFloat(assemblyItemBomObj.bomComponentLines[j].bomQuantity);
				
					buyItemForecastQuantityMtx.push(0);
					var buyItemForecastIndex = forecastItemIdMtx.indexOf(assemblyItemBomObj.bomComponentLines[j].itemId);
					if(buyItemForecastIndex > -1)
						buyItemForecastQuantityMtx[buyItemForecastQuantityMtx.length -1] = forecastQtyMtx[buyItemForecastIndex];
				}
				else
				{
					if(assemblyItemDemandQty > 0)
						buyItemDemandQuantityMtx[buyItemIndex] = parseFloat(buyItemDemandQuantityMtx[buyItemIndex]) + (parseFloat(assemblyItemDemandQty) * parseFloat(assemblyItemBomObj.bomComponentLines[j].bomQuantity));
				}
			}
		}
		
		assemblyItemAnalizedMtx[i] = true;
	}
	
	//--- Step 6 of 6. Saving Data & Rescheduling if needed ---//
	nlapiLogExecution('audit', 'Step 6 of 6', 'Saving Data & Rescheduling if needed');
	
	//Save data into CSV File
	var futureInventorySnapshotReportColumnsName = new Array();
	futureInventorySnapshotReportColumnsName.push('Item Id');
	futureInventorySnapshotReportColumnsName.push('Item Type');
	futureInventorySnapshotReportColumnsName.push('Item Name');
	futureInventorySnapshotReportColumnsName.push('Item Description');
	futureInventorySnapshotReportColumnsName.push('Item Unit Cost');
	futureInventorySnapshotReportColumnsName.push('Location');
	futureInventorySnapshotReportColumnsName.push('Quantity On Hand');
	futureInventorySnapshotReportColumnsName.push('Quantity Available');
	futureInventorySnapshotReportColumnsName.push('Quantity Backordered');
	futureInventorySnapshotReportColumnsName.push('Quantity On Order');
	futureInventorySnapshotReportColumnsName.push('Location Cost');
	futureInventorySnapshotReportColumnsName.push('Location Average Cost');
	futureInventorySnapshotReportColumnsName.push('Supply Quantity');
	futureInventorySnapshotReportColumnsName.push('Demand Quantity');
	futureInventorySnapshotReportColumnsName.push('Forecast Quantity');
	futureInventorySnapshotReportColumnsName.push('Expected Quantity');
	futureInventorySnapshotReportColumnsName.push('Expected Location Average Cost');
	
	var csvContent = '';
	for(var i=0; i<futureInventorySnapshotReportColumnsName.length; i++)
		csvContent += '"' + futureInventorySnapshotReportColumnsName[i] + '",';
	csvContent += '\n';
	
	for(var i=0; i<assemblyItemIdMtx.length; i++)
	{
		if(assemblyItemAnalizedMtx[i])
		{
			//(Opening Inventory + Supply Quantity) - (Forecast Quantity + Demand)
			var expectedQuantity = (parseFloat(assemblyItemLocationQtyOnHandMtx[i]) + parseFloat(assemblyItemSupplyQuantityMtx[i])) - (parseFloat(assemblyItemForecastQuantityMtx[i]) + parseFloat(assemblyItemDemandQuantityMtx[i]));
			var expectedCost = parseFloat(expectedQuantity) * parseFloat(assemblyItemLocationAverageCostMtx[i]);
			
			csvContent += '"' + assemblyItemIdMtx[i] + '","Assembly","' 
				+ assemblyItemNameMtx[i] + '","' + assemblyItemDescriptionMtx[i] + '","' + assemblyItemLocationCostMtx[i] + '","' + locationName + '","'
				+ assemblyItemLocationQtyOnHandMtx[i] + '","' + assemblyItemLocationQtyAvailableMtx[i] + '","' + assemblyItemLocationQtyBackorderedMtx[i] + '","' 
				+ assemblyItemLocationQtyOnOrderMtx[i] + '","' + assemblyItemLocationCostMtx[i] + '","' + assemblyItemLocationAverageCostMtx[i] + '","' 
				+ assemblyItemSupplyQuantityMtx[i] + '","' + assemblyItemDemandQuantityMtx[i] + '","' + assemblyItemForecastQuantityMtx[i] + '","' 
				+ expectedQuantity + '","' + expectedCost.toFixed(2) + '",';
			csvContent += '\r\n';
		}
	}
	
	for(var i=0; i<buyItemIdMtx.length; i++)
	{
		//(Opening Inventory + Supply Quantity) - (Forecast Quantity + Demand)
		var expectedQuantity = (parseFloat(buyItemLocationQtyOnHandMtx[i]) + parseFloat(buyItemSupplyQuantityMtx[i])) - (parseFloat(buyItemForecastQuantityMtx[i]) + parseFloat(buyItemDemandQuantityMtx[i]));
		var expectedCost = parseFloat(expectedQuantity) * parseFloat(buyItemLocationAverageCostMtx[i]);
		
		csvContent += '"' + buyItemIdMtx[i] + '","Inventory Item","' 
			+ buyItemNameMtx[i] + '","' + buyItemDescriptionMtx[i] + '","' + buyItemUnitCostMtx[i] + '","' + locationName + '","'
			+ buyItemLocationQtyOnHandMtx[i] + '","' + buyItemLocationQtyAvailableMtx[i] + '","' + buyItemLocationQtyBackorderedMtx[i] + '","' 
			+ buyItemLocationQtyOnOrderMtx[i] + '","' + buyItemLocationCostMtx[i] + '","' + buyItemLocationAverageCostMtx[i] + '","' 
			+ buyItemSupplyQuantityMtx[i] + '","' + buyItemDemandQuantityMtx[i] + '","' + buyItemForecastQuantityMtx[i] + '","' 
			+ expectedQuantity + '","' + expectedCost.toFixed(2) + '",';
		csvContent += '\r\n';
		
	}
	
	if(!memoryUsageOverflowControl)
	{
		var currentDate = new Date();
		var currentDateStr = (currentDate.getMonth() + 1) + '_' + currentDate.getDate() + '_' + currentDate.getFullYear() + '_' + currentDate.getHours() + currentDate.getMinutes() + currentDate.getSeconds();
		
		var futureInventorySnapshotRecord = null;
		if(notEmpty(futureInventorySnapshotRecordId))
			futureInventorySnapshotRecord = nlapiLoadRecord('customrecord_bit_hs_future_inv_snapshot', futureInventorySnapshotRecordId);
		else
			futureInventorySnapshotRecord = nlapiCreateRecord('customrecord_bit_hs_future_inv_snapshot');
			
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_location', locationId);
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_due_date', endDate);
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_report_status', 'Completed');
		
		if(notEmpty(reportFileId))
			nlapiDeleteFile(reportFileId);
		
		var	nsFutureInventorySnapshotFile = nlapiCreateFile('nsFutureInventorySnapshot_' + currentDateStr, 'CSV', csvContent);
		
		if(notEmpty(nsFolderId))
			nsFutureInventorySnapshotFile.setFolder(nsFolderId);
		
		nsFutureInventorySnapshotFile.setEncoding('UTF-8');
		var nsFutureInventorySnapshotFileId = nlapiSubmitFile(nsFutureInventorySnapshotFile);
		nlapiLogExecution('audit', 'File Saved', nsFutureInventorySnapshotFileId);

		var nsFutureInventorySnapshotFileUrl = nlapiLoadFile(nsFutureInventorySnapshotFileId).getURL();
		
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_report_file', nsFutureInventorySnapshotFileUrl);
		var futureInventorySnapshotRecordId = nlapiSubmitRecord(futureInventorySnapshotRecord);
		
		nlapiLogExecution('audit', 'Process completed');
	}
	else
	{
		var currentDate = new Date();
		var currentDateStr = (currentDate.getMonth() + 1) + '_' + currentDate.getDate() + '_' + currentDate.getFullYear() + '_' + currentDate.getHours() + currentDate.getMinutes() + currentDate.getSeconds();
		
		var futureInventorySnapshotRecord = null;
		if(notEmpty(futureInventorySnapshotRecordId))
			futureInventorySnapshotRecord = nlapiLoadRecord('customrecord_bit_hs_future_inv_snapshot', futureInventorySnapshotRecordId);
		else
			futureInventorySnapshotRecord = nlapiCreateRecord('customrecord_bit_hs_future_inv_snapshot');
			
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_location', locationId);
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_due_date', endDate);
		futureInventorySnapshotRecord.setFieldValue('custrecord_bit_hs_report_status', 'In Progress');
		var futureInventorySnapshotRecordId = nlapiSubmitRecord(futureInventorySnapshotRecord);
		
		if(notEmpty(reportFileId))
			nlapiDeleteFile(reportFileId);
		
		var	nsFutureInventorySnapshotFile = nlapiCreateFile('nsFutureInventorySnapshot_' + currentDateStr, 'CSV', csvContent);
		
		if(notEmpty(nsFolderId))
			nsFutureInventorySnapshotFile.setFolder(nsFolderId);
		
		nsFutureInventorySnapshotFile.setEncoding('UTF-8');
		var nsFutureInventorySnapshotFileId = nlapiSubmitFile(nsFutureInventorySnapshotFile);
		nlapiLogExecution('audit', 'File Saved', nsFutureInventorySnapshotFileId);

		var scheduleResult = nlapiScheduleScript('customscript_bit_hs_future_inv_snap_ss','customdeploy_bit_hs_future_inv_snap_ss',
				{	'custscript_bit_hs_location':locationId,
					'custscript_bit_hs_due_date':endDate,
					'custscript_bit_hs_folder_id':nsFolderId,
					'custscript_bit_hs_report_status':'In Progress',
					'custscript_bit_hs_report_file_id':reportFileId,
					'custscript_bit_hs_future_inv_snap_record':futureInventorySnapshotRecordId,
					'custscript_bit_hs_last_assembly_id':lastAssemblyId
				});
				
		
		nlapiLogExecution('audit', 'Script Rescheduled', scheduleResult);
	}
}




//This function gets the Forecast information 
function getForecastData(srArray, maxId, locationId, endDate)
{
	var forecastFilters = new Array();
	if(maxId > 0) forecastFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', maxId));
	forecastFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	forecastFilters.push(new nlobjSearchFilter('custrecord_forecast_location', null, 'is', locationId));
	if(notEmpty(endDate)) forecastFilters.push(new nlobjSearchFilter('custrecord_forecast_date', null, 'onorbefore', endDate));

	var forecastColumns = new Array();
	forecastColumns.push(new nlobjSearchColumn('custrecord_forecast_item'));	
	forecastColumns.push(new nlobjSearchColumn('custrecord_forecast_qty'));	
	
	var srResults = nlapiSearchRecord('customrecord_hs_forecast', null, forecastFilters, forecastColumns);
	if(notEmpty(srResults) && srResults.length > 999)
	{
		srArray.push(srResults);
		getForecastData(srArray, srResults[srResults.length-1].getId(), locationId, endDate);
	}
	else 
		srArray.push(srResults);
}

//This function will look for all active Assembly Items by specified location
function getAssemblyItems(srArray, maxId, locationId)
{
	var assemblyItemFilters = new Array();
	
	if(maxId > 0) assemblyItemFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', maxId));
	assemblyItemFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	assemblyItemFilters.push(new nlobjSearchFilter('inventorylocation', null, 'is', locationId));
	assemblyItemFilters.push(new nlobjSearchFilter('custitem_sellable_item', null, 'is', 'T'));
	
	var assemblyItemColumns = new Array();
	assemblyItemColumns.push(new nlobjSearchColumn('internalid').setSort());
	assemblyItemColumns.push(new nlobjSearchColumn('itemid'));
	assemblyItemColumns.push(new nlobjSearchColumn('description'));
	assemblyItemColumns.push(new nlobjSearchColumn('locationcost'));	
	assemblyItemColumns.push(new nlobjSearchColumn('locationaveragecost'));	
	assemblyItemColumns.push(new nlobjSearchColumn('locationquantityonhand'));	
	assemblyItemColumns.push(new nlobjSearchColumn('locationquantityavailable'));
	assemblyItemColumns.push(new nlobjSearchColumn('locationquantitybackordered'));	
	assemblyItemColumns.push(new nlobjSearchColumn('locationquantityonorder'));
	
	var srResults = nlapiSearchRecord('assemblyitem', null, assemblyItemFilters, assemblyItemColumns);
	if(notEmpty(srResults) && srResults.length > 999)
	{
		srArray.push(srResults);
		getAssemblyItems(srArray, srResults[srResults.length-1].getId(), locationId);
	}
	else 
		srArray.push(srResults);
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
			itemBomLineObj.itemType = srItemBOM[i].getValue('type','memberitem');
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
			itemBomLineObj.locationCost = parseFloat(notEmpty(srItemBOM[i].getValue('locationcost', 'memberitem')) ? srItemBOM[i].getValue('locationcost', 'memberitem') : 0); 
			itemBomLineObj.locationAverageCost = parseFloat(notEmpty(srItemBOM[i].getValue('locationaveragecost', 'memberitem')) ? srItemBOM[i].getValue('locationaveragecost', 'memberitem') : 0); 
			
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
	columnBomItem.push(new nlobjSearchColumn('internalid').setSort());
	columnBomItem.push(new nlobjSearchColumn('itemid'));
	columnBomItem.push(new nlobjSearchColumn('memberitem'));
	columnBomItem.push(new nlobjSearchColumn('memberquantity'));
	columnBomItem.push(new nlobjSearchColumn('description', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('cost', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('locationcost', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationaveragecost', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationquantityonhand', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationquantityavailable', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('locationquantitybackordered', 'memberitem'));	
	columnBomItem.push(new nlobjSearchColumn('locationquantityonorder', 'memberitem'));
	columnBomItem.push(new nlobjSearchColumn('type', 'memberitem'));

	return nlapiSearchRecord('item', null, filterBomExpression, columnBomItem);

}

//This function gets demand based on sales orders not fulfilled
function getSalesOrderDemandSr(srArray, maxId, locationId, isOpen, isApproved, isInactiveItem, fromCreatedDate, toCreatedDate, fromLastModifiedDate, toLastModifiedDate)
{
	var salesOrderFilters = new Array();
	
	if(maxId > 0) salesOrderFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', maxId));
	
	if(notEmpty(fromCreatedDate) && notEmpty(toCreatedDate))
		salesOrderFilters.push(new nlobjSearchFilter('datecreated', null, 'within', fromCreatedDate, toCreatedDate));
	
	if(notEmpty(fromLastModifiedDate) && notEmpty(toLastModifiedDate))
		salesOrderFilters.push(new nlobjSearchFilter('lastmodifieddate', null, 'within', fromLastModifiedDate, toLastModifiedDate));

	if(notEmpty(isOpen))
	{
		salesOrderFilters.push(new nlobjSearchFilter('shiprecvstatusline', null, 'is', ((isOpen == 'T') ? 'F' : 'T')));
		
		if(isOpen == 'T') 
			salesOrderFilters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
	}

	if(notEmpty(isApproved) )
	{
		if(isApproved == 'F')
			salesOrderFilters.push(new nlobjSearchFilter('status', null, 'is', 'SalesOrd:A'));
		else
			salesOrderFilters.push(new nlobjSearchFilter('status', null, 'noneof', 'SalesOrd:A'));
	}

	if(notEmpty(isInactiveItem))
		salesOrderFilters.push(new nlobjSearchFilter('isinactive', 'item', 'is', isInactiveItem));
	
	if(notEmpty(locationId))
		salesOrderFilters.push(new nlobjSearchFilter('location', null, 'is', locationId));
	
	salesOrderFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));
	salesOrderFilters.push(new nlobjSearchFilter('taxline', null, 'is', 'F'));
	salesOrderFilters.push(new nlobjSearchFilter('type', 'item', 'anyOf', ['InvtPart','Assembly','Kit']));
	
	var salesOrderColumns = new Array();
	salesOrderColumns.push(new nlobjSearchColumn('internalid').setSort());
	salesOrderColumns.push(new nlobjSearchColumn('datecreated'));
	salesOrderColumns.push(new nlobjSearchColumn('lastmodifieddate'));
	salesOrderColumns.push(new nlobjSearchColumn('trandate'));
	salesOrderColumns.push(new nlobjSearchColumn('tranid'));					
	salesOrderColumns.push(new nlobjSearchColumn('name'));
	salesOrderColumns.push(new nlobjSearchColumn('memo'));
	salesOrderColumns.push(new nlobjSearchColumn('location'));
	salesOrderColumns.push(new nlobjSearchColumn('line'));
	salesOrderColumns.push(new nlobjSearchColumn('item'));
	salesOrderColumns.push(new nlobjSearchColumn('quantity'));
	salesOrderColumns.push(new nlobjSearchColumn('quantitycommitted'));
	salesOrderColumns.push(new nlobjSearchColumn('quantityshiprecv'));
	salesOrderColumns.push(new nlobjSearchColumn('quantitybilled'));
	salesOrderColumns.push(new nlobjSearchColumn('closed'));

	salesOrderColumns.push(new nlobjSearchColumn('shipaddress'));
	salesOrderColumns.push(new nlobjSearchColumn('amount'));
	salesOrderColumns.push(new nlobjSearchColumn('status'));
	
	var srResults = nlapiSearchRecord('salesorder', null, salesOrderFilters, salesOrderColumns); 
	
	if(notEmpty(srResults) && srResults.length > 999)
	{
		
		//Last SO validation
		var lastId = srResults[999].getId();
		while(srResults[srResults.length-1].getId() == lastId)
			srResults = srResults.slice(0, -1);
		
		srArray.push(srResults);
		getSalesOrderDemandSr(srArray, srResults[srResults.length-1].getId(), isOpen, isApproved, isInactiveItem, fromCreatedDate, toCreatedDate, fromLastModifiedDate, toLastModifiedDate);
	}
	else 
		srArray.push(srResults);
}

//This function gets line items of Planned Purchase Orders
function getPlannedPurchaseOrdersSr(srArray, maxId, locationId, isOpen, isApproved, isInactiveItem, fromCreatedDate, toCreatedDate, fromLastModifiedDate, toLastModifiedDate)
{
	var purchaseOrderFilters = new Array();
	
	if(maxId > 0) purchaseOrderFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', maxId));

	if(notEmpty(fromCreatedDate) && notEmpty(toCreatedDate))
		purchaseOrderFilters.push(new nlobjSearchFilter('datecreated', null, 'within', fromCreatedDate, toCreatedDate));
	
	if(notEmpty(fromLastModifiedDate) && notEmpty(toLastModifiedDate))
		purchaseOrderFilters.push(new nlobjSearchFilter('lastmodifieddate', null, 'within', fromLastModifiedDate, toLastModifiedDate));
	
	if(notEmpty(isOpen))
	{
		purchaseOrderFilters.push(new nlobjSearchFilter('shiprecvstatusline', null, 'is', ((isOpen == 'T') ? 'F' : 'T')));
		
		if(isOpen == 'T')
			purchaseOrderFilters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
	}
	
	if(notEmpty(isApproved) )
	{
		if(isApproved == 'F')
			purchaseOrderFilters.push(new nlobjSearchFilter('status', null, 'is', 'PurchOrd:A'));
		else
			purchaseOrderFilters.push(new nlobjSearchFilter('status', null, 'noneof', 'PurchOrd:A'));
	}
	
	if(notEmpty(isInactiveItem))
		purchaseOrderFilters.push(new nlobjSearchFilter('isinactive', 'item', 'is', isInactiveItem));

	if(notEmpty(locationId))
		purchaseOrderFilters.push(new nlobjSearchFilter('location', null, 'is', locationId));

	purchaseOrderFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));
	purchaseOrderFilters.push(new nlobjSearchFilter('quantity', null, 'greaterthan', 0));
	purchaseOrderFilters.push(new nlobjSearchFilter('type', 'item', 'anyOf', ['InvtPart','Assembly','Kit']));
		
	var purchaseOrderColumns = new Array();
	purchaseOrderColumns.push(new nlobjSearchColumn('internalid').setSort());
	purchaseOrderColumns.push(new nlobjSearchColumn('trandate'));
	purchaseOrderColumns.push(new nlobjSearchColumn('datecreated'));
	purchaseOrderColumns.push(new nlobjSearchColumn('lastmodifieddate'));
	purchaseOrderColumns.push(new nlobjSearchColumn('tranid'));						//Document Number
	purchaseOrderColumns.push(new nlobjSearchColumn('status'));
	purchaseOrderColumns.push(new nlobjSearchColumn('companyname','vendor'));						//Vendor
	purchaseOrderColumns.push(new nlobjSearchColumn('memo'));
	purchaseOrderColumns.push(new nlobjSearchColumn('location'));
	purchaseOrderColumns.push(new nlobjSearchColumn('line'));
	purchaseOrderColumns.push(new nlobjSearchColumn('item'));
	purchaseOrderColumns.push(new nlobjSearchColumn('type','item'));
	purchaseOrderColumns.push(new nlobjSearchColumn('quantity'));
	purchaseOrderColumns.push(new nlobjSearchColumn('quantityshiprecv'));
	purchaseOrderColumns.push(new nlobjSearchColumn('quantitybilled'));
	purchaseOrderColumns.push(new nlobjSearchColumn('rate'));
	purchaseOrderColumns.push(new nlobjSearchColumn('amount'));
	purchaseOrderColumns.push(new nlobjSearchColumn('expectedreceiptdate'));
	purchaseOrderColumns.push(new nlobjSearchColumn('externalid'));
	purchaseOrderColumns.push(new nlobjSearchColumn('closed'));
	purchaseOrderColumns.push(new nlobjSearchColumn('approvalstatus'));
	
	var srResults = nlapiSearchRecord('purchaseorder', null, purchaseOrderFilters, purchaseOrderColumns); 
	
	if(notEmpty(srResults) && srResults.length > 999)
	{
		//Last PO validation
		var lastId = srResults[999].getId();
		while(srResults[srResults.length-1].getId() == lastId)
			srResults = srResults.slice(0, -1);
		
		srArray.push(srResults);
		getPlannedPurchaseOrdersSr(srArray, srResults[srResults.length-1].getId(), locationId, isOpen, isApproved, isInactiveItem, fromCreatedDate, toCreatedDate, fromLastModifiedDate, toLastModifiedDate);
	}
	else 
		srArray.push(srResults);
}

//--- General Javascript Functions ---//

function isEmpty(val) {
	return (val == null || val == '' || val == 'null');
}

function notEmpty(tmp) {
	return !isEmpty(tmp);
}