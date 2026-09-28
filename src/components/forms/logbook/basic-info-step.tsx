import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DeliveryMethod, MeetingType, VisitType } from "@/types";

const parseTimeToDate = (timeStr?: string): Date | undefined => {
  if (!timeStr) return undefined;
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const d = new Date();
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return d;
};

const formatTimeToStr = (date?: Date): string => {
  if (!date) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export function BasicInfoStep() {
  const {
    formState,
    watch,
    setValue,
    control,
    trigger,
  } = useFormContext();
  const errors = formState.errors;

  const meetingType = watch("meetingType");
  const deliveryMethod = watch("deliveryMethod");
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const jpl = watch("jpl");

  const recalculateJpl = React.useCallback((newStart?: string, newEnd?: string) => {
    const s = newStart || startTime;
    const e = newEnd || endTime;
    if (s && e) {
      const start = parseTimeToDate(s);
      const end = parseTimeToDate(e);
      if (start && end) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        const calculatedJpl = diffMinutes < 0 ? 0 : Math.max(1, Math.round(diffMinutes / 45));
        setValue("jpl", calculatedJpl, { shouldValidate: true });
        trigger(["startTime", "endTime"]);
      }
    }
  }, [startTime, endTime, setValue, trigger]);

  // Recalculate JPL if in GROUP meeting and jpl is not yet populated
  React.useEffect(() => {
    if (meetingType === MeetingType.GROUP && (!jpl || jpl <= 0)) {
      recalculateJpl();
    }
  }, [meetingType, jpl, recalculateJpl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Waktu & Metode</CardTitle>
        <CardDescription>
          Tentukan kapan dan bagaimana kegiatan pendampingan dilakukan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FieldGroup className={`grid gap-6 ${meetingType === MeetingType.GROUP ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <Field>
            <FieldLabel>Tanggal Kegiatan</FieldLabel>
            <Controller
              control={control}
              name="logbookDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pilih tanggal kegiatan"
                />
              )}
            />
            <FieldError errors={[errors.logbookDate]} />
          </Field>
          <Field>
            <FieldLabel>Waktu Mulai</FieldLabel>
            <div className="flex h-11 items-center">
              <Controller
                control={control}
                name="startTime"
                render={({ field }) => (
                  <TimePicker
                    date={parseTimeToDate(field.value)}
                    setDate={(date) => {
                      const timeStr = formatTimeToStr(date);
                      field.onChange(timeStr);
                      if (meetingType === MeetingType.GROUP) {
                        recalculateJpl(timeStr, undefined);
                      }
                    }}
                  />
                )}
              />
            </div>
            <FieldError errors={[errors.startTime]} />
          </Field>
          <Field>
            <FieldLabel>Waktu Selesai</FieldLabel>
            <div className="flex h-11 items-center">
              <Controller
                control={control}
                name="endTime"
                render={({ field }) => (
                  <TimePicker
                    date={parseTimeToDate(field.value)}
                    setDate={(date) => {
                      const timeStr = formatTimeToStr(date);
                      field.onChange(timeStr);
                      if (meetingType === MeetingType.GROUP) {
                        recalculateJpl(undefined, timeStr);
                      }
                    }}
                  />
                )}
              />
            </div>
            <FieldError errors={[errors.endTime]} />
          </Field>
          {meetingType === MeetingType.GROUP && (
            <Field className="w-fit animate-in fade-in duration-200">
              <FieldLabel>JPL</FieldLabel>
              <Controller
                control={control}
                name="jpl"
                render={({ field }) => (
                  <Input
                    type="number"
                    placeholder="0"
                    className="h-11 font-mono text-center w-24 text-base font-semibold bg-muted/40 border-muted-foreground/20 disabled:opacity-100"
                    disabled
                    min={0}
                    max={999}
                    value={field.value !== undefined && field.value !== null ? String(field.value).slice(0, 3) : ""}
                    onChange={(e) => {
                      const val = e.target.valueAsNumber || 0;
                      field.onChange(Math.min(999, Math.max(0, val)));
                    }}
                  />
                )}
              />
              <FieldError errors={[errors.jpl]} />
            </Field>
          )}
        </FieldGroup>

        <FieldGroup className={`grid gap-6 ${deliveryMethod === DeliveryMethod.OFFLINE && meetingType === MeetingType.INDIVIDUAL ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <Field>
            <FieldLabel>Metode Pengiriman</FieldLabel>
            <Controller
              control={control}
              name="deliveryMethod"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Pilih Metode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeliveryMethod.OFFLINE}>
                      Luring (Offline)
                    </SelectItem>
                    <SelectItem value={DeliveryMethod.ONLINE}>
                      Daring (Online)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.deliveryMethod]} />
          </Field>
          <Field>
            <FieldLabel>Jenis Pertemuan</FieldLabel>
            <Controller
              control={control}
              name="meetingType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Pilih Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MeetingType.INDIVIDUAL}>Individu</SelectItem>
                    <SelectItem value={MeetingType.GROUP}>Kelompok</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.meetingType]} />
          </Field>
          {deliveryMethod === DeliveryMethod.OFFLINE && meetingType === MeetingType.INDIVIDUAL && (
            <Field className="animate-in fade-in duration-200">
              <FieldLabel>Jenis Kunjungan</FieldLabel>
              <Controller
                control={control}
                name="visitType"
                render={({ field }) => (
                  <Select
                    value={field.value === VisitType.NONE ? VisitType.LOCAL : field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih Kunjungan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VisitType.LOCAL}>Lokal</SelectItem>
                      <SelectItem value={VisitType.OUT_OF_TOWN}>Luar Kota</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.visitType]} />
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
