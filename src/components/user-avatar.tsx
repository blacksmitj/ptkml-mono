import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  previewable?: boolean;
}

export function UserAvatar({ name, src, className, previewable = false }: UserAvatarProps) {
  const dicebearUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  const avatarUrl = src ? normalizeFileUrl(src) : dicebearUrl;
  
  const avatarContent = (
    <Avatar className={cn("h-8 w-8", className, previewable && "cursor-pointer hover:opacity-90 transition-opacity")}>
      {src && <AvatarImage src={normalizeFileUrl(src)} alt={name} className="object-cover" />}
      <AvatarFallback className="p-0 bg-transparent">
        <img src={dicebearUrl} alt={name} className="h-full w-full object-cover rounded-full" />
      </AvatarFallback>
    </Avatar>
  );

  if (!previewable) {
    return avatarContent;
  }

  return (
    <Dialog>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {avatarContent}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
        <DialogTitle className="sr-only">Foto Profil {name}</DialogTitle>
        <DialogDescription className="sr-only">Lihat foto profil {name} ukuran penuh</DialogDescription>
        <img 
          src={avatarUrl} 
          alt={name} 
          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" 
        />
      </DialogContent>
    </Dialog>
  );
}

