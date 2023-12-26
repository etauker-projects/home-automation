import { Schema, z } from 'zod';

export enum TypesEnum {
    EMPTY = 'EMPTY',
    DAY_MARKER = 'DAY_MARKER',
    SENSOR_EXCEPTION = 'SENSOR_EXCEPTION',
    ALARM = 'ALARM',
    SENSOR_READING = 'SENSOR_READING',
    BOLUS = 'BOLUS',
    BOLUS_ENTERED = 'BOLUS_ENTERED',
    BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
    UNKNOWN = 'UNKNOWN',
    PRIMED = 'PRIMED',
    MEAL = 'MEAL',
    BOLUS_CANCELLED = 'BOLUS_CANCELLED',
    SUSPEND = 'SUSPEND',
    CALIBRATION_REJECTED = 'CALIBRATION_REJECTED',
    DELIVERY_STOPPED = 'DELIVERY_STOPPED',
    CALIBRATION = 'CALIBRATION',
    BASAL_TEMP_PERCENTAGE = 'BASAL_TEMP_PERCENTAGE',
    INSULIN_ACTION_CURVE = 'INSULIN_ACTION_CURVE',
};

export type Types = keyof typeof TypesEnum;



const DayMarkerSchema = z.object({
    date: z.string(),
    time: z.string(),
    event_marker: z.string().refine((val) => [ 'Start of the day', 'End of the day' ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.DAY_MARKER),
});

enum SensorExceptionTypes {
    SENSOR_END_OF_LIFE = 'SENSOR_END_OF_LIFE',
    SENSOR_INIT_CODE = 'SENSOR_INIT_CODE',
    SENSOR_CAL_ERROR = 'SENSOR_CAL_ERROR',
    SENSOR_CAL_NEEDED_CODE = 'SENSOR_CAL_NEEDED_CODE',
    SENSOR_ERROR = 'SENSOR_ERROR',
    SENSOR_CHANGE_SENSOR_ERROR = 'SENSOR_CHANGE_SENSOR_ERROR',
};
export type SensorExceptionType = keyof typeof SensorExceptionTypes;
const SensorExceptionSchema = z.object({
    date: z.string(),
    time: z.string(),
    sensor_exception: z.string().refine((val) => [
        'SENSOR_END_OF_LIFE',
        'SENSOR_INIT_CODE',
        'SENSOR_CAL_ERROR',
        'SENSOR_CAL_NEEDED_CODE',
        'SENSOR_ERROR',
        'SENSOR_CHANGE_SENSOR_ERROR',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.SENSOR_EXCEPTION),
});


enum AlarmTypes {
    'LOW BATTERY PUMP' = 'LOW BATTERY PUMP',
    'REPLACE BATTERY ALERT' = 'REPLACE BATTERY ALERT',
    'SENSOR CONNECTED' = 'SENSOR CONNECTED',
    'SENSOR CALIBRATION' = 'SENSOR CALIBRATION',
    'SMARTGUARD BG REQUIRED' = 'SMARTGUARD BG REQUIRED',
    'ALERT ON LOW' = 'ALERT ON LOW',
    'URGENT LOW SENSOR GLUCOSE' = 'URGENT LOW SENSOR GLUCOSE',
    'SET CHANGE REMINDER' = 'SET CHANGE REMINDER',
    'SENSOR UPDATING ALERT' = 'SENSOR UPDATING ALERT',
    'CHANGE SENSOR' = 'CHANGE SENSOR',
    'SMARTGUARD EXIT' = 'SMARTGUARD EXIT',
    'LOST SENSOR SIGNAL' = 'LOST SENSOR SIGNAL',
    'UNRESPONSIVE USER ALARM' = 'UNRESPONSIVE USER ALARM',
    'SUSPEND ON LOW ALARM' = 'SUSPEND ON LOW ALARM',
    'BASAL DELIVERY RESUMED' = 'BASAL DELIVERY RESUMED',
    'BOLUS NOT DELIVERED ALERT' = 'BOLUS NOT DELIVERED ALERT',
    'CHECK SENSOR TRANSMITTER CONNECTION ALERT' = 'CHECK SENSOR TRANSMITTER CONNECTION ALERT',
    'RESERVOIR' = 'RESERVOIR',
    'INSERT BATTERY ALARM - DELIVERY STOPPED' = 'INSERT BATTERY ALARM - DELIVERY STOPPED',
    'REPLACE BATTERY ALARM - DELIVERY STOPPED' = 'REPLACE BATTERY ALARM - DELIVERY STOPPED',
};
export type AlarmType = keyof typeof AlarmTypes;
const AlarmSchema = z.object({
    date: z.string(),
    time: z.string(),
    alarm: z.string().refine((val) => Object.keys(AlarmTypes).includes(val.trim())),
    type: z.string().optional().default(TypesEnum.ALARM),
});


const SensorReadingSchema = z.object({
    date: z.string(),
    time: z.string(),
    'sensor_glucose_(mmol/l)': z.string().transform(val => parseFloat(val)),
    isig_value: z.string().transform(val => parseFloat(val)),
    type: z.string().optional().default(TypesEnum.SENSOR_READING),
});
const BolusSchema = z.object({
    date: z.string(),
    time: z.string(),
    'bolus_volume_delivered_(u)': z.string().transform(val => parseFloat(val)),
    bolus_source: z.string().refine((val) => [
        'CLOSED_LOOP_AUTO_INSULIN',
        'BOLUS_WIZARD',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.BOLUS),
});
const BolusEnteredSchema = z.object({
    date: z.string(),
    time: z.string(),
    bolus_type: z.string().refine((val) => [
        'Normal',
    ].includes(val.trim())),
    bolus_number: z.string().transform(val => parseFloat(val)),
    'bolus_volume_selected_(u)': z.string().transform(val => parseFloat(val)),
    bolus_source: z.string().refine((val) => [
        'MANUAL',
        'BOLUS_WIZARD',
        'CLOSED_LOOP_BG_CORRECTION',
        'CLOSED_LOOP_BG_CORRECTION_AND_FOOD_BOLUS',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.BOLUS_ENTERED),
});

const BloodGlucoseSchema = z.object({
    date: z.string(),
    time: z.string(),
    'bg_reading_(mmol/l)': z.string().transform(val => parseFloat(val)),
    bg_source: z.string().refine((val) => [
        'ENTERED_IN_BG_ENTRY',
        'BG_SENT_FOR_CALIB',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.BLOOD_GLUCOSE),
});

const UnknownSchema = z.object({
    date: z.string(),
    time: z.string(),
    'bwz_unabsorbed_insulin_total_(u)': z.string().transform(val => parseFloat(val)),
    final_bolus_estimate: z.string().transform(val => parseFloat(val)),
    scroll_step_size: z.string(),
    type: z.string().optional().default(TypesEnum.UNKNOWN),
});

const BasalSchema = z.object({
    date: z.string(),
    time: z.string(),
    'basal_rate_(u/h)': z.string().transform(val => parseFloat(val)),
    type: z.string().optional().default(TypesEnum.EMPTY),
});

const PrimedSchema = z.object({
    date: z.string(),
    time: z.string(),
    prime_type: z.string().refine((val) => [
        'Cannula Fill',
        'Tubing Fill',
    ].includes(val.trim())),
    // 'primedrate_(u/h)': z.string().transform(val => parseFloat(val)),
    'prime_volume_delivered_(u)': z.string().transform(val => parseFloat(val)),
    type: z.string().optional().default(TypesEnum.PRIMED),
});

const EmptySchema = z.object({
    date: z.string(),
    time: z.string(),
    type: z.string().optional().default(TypesEnum.EMPTY),
});

const MealSchema = z.object({
    date: z.string(),
    time: z.string(),
    'bwz_estimate_(u)': z.string().transform(val => parseFloat(val)),
    'bwz_target_high_bg_(mmol/l)': z.string().optional().transform(val => val ? parseFloat(val) : val),
    'bwz_target_low_bg_(mmol/l)': z.string().optional().transform(val => val ? parseFloat(val) : val),
    'bwz_carb_ratio_(g/u)': z.string().transform(val => parseFloat(val)),
    'bwz_insulin_sensitivity_(mmol/l/u)': z.string().optional().transform(val => val ? parseFloat(val) : val),
    'bwz_carb_input_(grams)': z.string().transform(val => parseFloat(val)),
    'bwz_bg/sg_input_(mmol/l)': z.string().transform(val => parseFloat(val)),
    'bwz_correction_estimate_(u)': z.string().transform(val => parseFloat(val)),
    'bwz_food_estimate_(u)': z.string().transform(val => parseFloat(val)),
    'bwz_active_insulin_(u)': z.string().optional().transform(val => val ? parseFloat(val) : val),
    bwz_status: z.string().refine((val) => [
        'Delivered',
        'Not Delivered',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.MEAL),
});

const BolusCancellationSchema = z.object({
    date: z.string(),
    time: z.string(),
    bolus_type: z.string(),
    bolus_number: z.string().transform(val => parseFloat(val)),
    bolus_cancellation_reason: z.string().refine((val) => [
        'User Request',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.BOLUS_CANCELLED),
});
const SuspendSchema = z.object({
    date: z.string(),
    time: z.string(),
    suspend: z.string().refine((val) => [
        'NORMAL_PUMPING',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.SUSPEND),
});
const SensorCalibrationRejectedSchema = z.object({
    date: z.string(),
    time: z.string(),
    sensor_calibration_rejected_reason: z.string().refine((val) => [
        'CALIBRATION_FAILED',
    ].includes(val.trim())),
    type: z.string().optional().default(TypesEnum.CALIBRATION_REJECTED),
});

const SensorCalibrationSchema = z.object({
    date: z.string(),
    time: z.string(),
    'sensor_calibration_bg_(mmol/l)': z.string().transform(val => parseFloat(val)),
    type: z.string().optional().default(TypesEnum.CALIBRATION),
});

const TempBasalSchema = z.object({
    date: z.string(),
    time: z.string(),
    temp_basal_amount: z.string().transform(val => parseFloat(val)),
    temp_basal_type: z.string().refine((val) => [
        'Percent',
    ].includes(val.trim())),
    'temp_basal_duration_(h:mm:ss)': z.string(),
    type: z.string().optional().default(TypesEnum.BASAL_TEMP_PERCENTAGE),
});

const InsulinActionCurveSchema = z.object({
    date: z.string(),
    time: z.string(),
    insulin_action_curve_time: z.string().transform(val => parseFloat(val)),
    type: z.string().optional().default(TypesEnum.INSULIN_ACTION_CURVE),
});

// TODO: return type as Types
export type DayMarker = z.infer<typeof DayMarkerSchema>;
export type SensorException = z.infer<typeof SensorExceptionSchema>;
export type Alarm = z.infer<typeof AlarmSchema>;
export type SensorReading = z.infer<typeof SensorReadingSchema>;
export type BolusEntered = z.infer<typeof BolusEnteredSchema>;
export type Bolus = z.infer<typeof BolusSchema>;
export type BloodGlucose = z.infer<typeof BloodGlucoseSchema>;
export type Unknown = z.infer<typeof UnknownSchema>;
export type Basal = z.infer<typeof BasalSchema>;
export type Primed = z.infer<typeof PrimedSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type BolusCancellation = z.infer<typeof BolusCancellationSchema>;
export type Suspend = z.infer<typeof SuspendSchema>;
export type SensorCalibrationRejected = z.infer<typeof SensorCalibrationRejectedSchema>;
export type SensorCalibration = z.infer<typeof SensorCalibrationSchema>;
export type TempBasal = z.infer<typeof TempBasalSchema>;
export type InsulinActionCurve = z.infer<typeof InsulinActionCurveSchema>;
export type Empty = z.infer<typeof EmptySchema>;

export type Mapped = Empty
    | DayMarker
    | SensorException
    | Alarm
    | SensorReading
    | BolusEntered
    | Bolus
    | BloodGlucose
    | Unknown
    | Basal
    | Primed
    | Meal
    | BolusCancellation
    | Suspend
    | SensorCalibrationRejected
    | SensorCalibration
    | TempBasal
    | InsulinActionCurve
;


export const parse = (object: any): Empty | DayMarker | SensorException | Alarm | SensorReading | Bolus | BloodGlucose | Unknown | Basal | BolusEntered | Primed | Meal | BolusCancellation | Suspend | SensorCalibrationRejected | SensorCalibration | TempBasal | InsulinActionCurve => {
    let result;

    result = DayMarkerSchema.safeParse(object);
    if (result.success) {
        return result.data as DayMarker;
    }

    result = SensorExceptionSchema.safeParse(object);
    if (result.success) {
        return result.data as SensorException;
    }

    result = AlarmSchema.safeParse(object);
    if (result.success) {
        return result.data as Alarm;
    }

    result = SensorReadingSchema.safeParse(object);
    if (result.success) {
        return result.data as SensorReading;
    }

    result = BolusSchema.safeParse(object);
    if (result.success) {
        return result.data as Bolus;
    }

    result = BolusEnteredSchema.safeParse(object);
    if (result.success) {
        return result.data as BolusEntered;
    }

    result = BloodGlucoseSchema.safeParse(object);
    if (result.success) {
        return result.data as BloodGlucose;
    }

    result = UnknownSchema.safeParse(object);
    if (result.success) {
        return result.data as Unknown;
    }

    result = BasalSchema.safeParse(object);
    if (result.success) {
        return result.data as Basal;
    }

    result = PrimedSchema.safeParse(object);
    if (result.success) {
        return result.data as Primed;
    }

    result = MealSchema.safeParse(object);
    if (result.success) {
        return result.data as Meal;
    }

    result = BolusCancellationSchema.safeParse(object);
    if (result.success) {
        return result.data as BolusCancellation;
    }

    result = SuspendSchema.safeParse(object);
    if (result.success) {
        return result.data as Suspend;
    }

    result = SensorCalibrationRejectedSchema.safeParse(object);
    if (result.success) {
        return result.data as SensorCalibrationRejected;
    }

    result = SensorCalibrationSchema.safeParse(object);
    if (result.success) {
        return result.data as SensorCalibration;
    }

    result = TempBasalSchema.safeParse(object);
    if (result.success) {
        return result.data as TempBasal;
    }

    result = InsulinActionCurveSchema.safeParse(object);
    if (result.success) {
        return result.data as InsulinActionCurve;
    }

    // [ 'index', 'date', 'time' ]
    if (Object.keys(object).length === 3) {
        return EmptySchema.parse(object);
    }

    console.log('unparsed:', object);
    return object;
}