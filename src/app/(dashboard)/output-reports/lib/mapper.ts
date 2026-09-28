import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { MappedOutputReport } from "./types";

export function mapOutputReports(rawList: any[]): MappedOutputReport[] {
  if (!Array.isArray(rawList)) return [];
  
  return rawList.map((o) => {
    const applicant = o.applicant;
    const profile = applicant?.profile;
    const mentorProfile = applicant?.mentor?.user?.profile;
    const mentorUniv = applicant?.mentor?.university;
    const verifierProfile = o.verifiedBy?.user?.profile;
    
    return {
      ...o,
      applicantName: profile?.name || "N/A",
      applicantIdTkm: applicant?.idTkm || "N/A",
      applicantPhoto: profile?.photo || null,
      mentorName: mentorProfile?.name || null,
      mentorPhoto: mentorProfile?.photo || null,
      mentorUnivName: mentorUniv?.name || null,
      verifierName: verifierProfile?.name || null,
      verifierPhoto: verifierProfile?.photo || null,
      revenueFormatted: new Intl.NumberFormat("id-ID", { 
        style: "currency", 
        currency: "IDR" 
      }).format(o.revenue || 0),
      formattedDate: o.createdAt 
        ? formatDistanceToNow(new Date(o.createdAt), {
            addSuffix: true,
            locale: id,
          })
        : "N/A",
    };
  });
}
