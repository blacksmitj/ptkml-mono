import { format } from "date-fns";
import { id } from "date-fns/locale";
import { MappedLogbook } from "./types";

export function mapLogbooks(rawList: any[]): MappedLogbook[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((l) => {
    const creatorProfile = l.createdBy?.user?.profile;

    return {
      ...l,
      mentorName: creatorProfile?.name || "N/A",
      mentorPhoto: creatorProfile?.photo || null,
      formattedDate: l.logbookDate
        ? format(new Date(l.logbookDate), "dd MMM yyyy", {
            locale: id,
          })
        : "N/A",
    };
  });
}
