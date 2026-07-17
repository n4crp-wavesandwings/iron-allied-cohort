import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_COMM_METHODS,
  CONTACT_RELATIONSHIP_STRENGTHS,
  PREFERRED_CONTACT_METHODS,
  type ContactCommMethod,
  type ContactRelationshipStrength,
  type ContactRow,
  type PreferredContactMethod,
} from "@/lib/contacts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  contact?: ContactRow | null;
}

export function ContactDialog({ open, onOpenChange, entityId, contact }: Props) {
  const isEdit = !!contact;
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [teams, setTeams] = useState("");
  const [preferred, setPreferred] = useState<PreferredContactMethod | "">("");
  const [prefCommV2, setPrefCommV2] = useState<ContactCommMethod | "">("");
  const [strength, setStrength] = useState<ContactRelationshipStrength | "">("");
  const [birthday, setBirthday] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setFirstName(contact?.first_name ?? "");
      setLastName(contact?.last_name ?? "");
      setPreferredName((contact as any)?.preferred_name ?? "");
      setJobTitle(contact?.job_title ?? "");
      setDepartment(contact?.department ?? "");
      setEmail(contact?.email ?? "");
      setOfficePhone(contact?.office_phone ?? "");
      setMobilePhone(contact?.mobile_phone ?? "");
      setLinkedIn((contact as any)?.linkedin ?? "");
      setTeams((contact as any)?.microsoft_teams ?? "");
      setPreferred((contact?.preferred_contact_method as PreferredContactMethod) ?? "");
      setPrefCommV2(((contact as any)?.preferred_communication_method_v2 as ContactCommMethod) ?? "");
      setStrength(((contact as any)?.relationship_strength as ContactRelationshipStrength) ?? "");
      setBirthday((contact as any)?.birthday ?? "");
      setBestTime(contact?.best_time_to_contact ?? "");
      setNotes(contact?.note ?? "");
      setActive(contact?.active ?? true);
    }
  }, [open, contact]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First Name and Last Name are required.");
      }
      const payload = {
        entity_id: entityId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        preferred_name: preferredName.trim() || null,
        job_title: jobTitle.trim() || null,
        department: department.trim() || null,
        email: email.trim() || null,
        office_phone: officePhone.trim() || null,
        mobile_phone: mobilePhone.trim() || null,
        linkedin: linkedIn.trim() || null,
        microsoft_teams: teams.trim() || null,
        preferred_contact_method: preferred || null,
        preferred_communication_method_v2: prefCommV2 || null,
        relationship_strength: strength || null,
        birthday: birthday || null,
        best_time_to_contact: bestTime.trim() || null,
        note: notes.trim() || null,
        active,
      };
      if (isEdit && contact) {
        const { error } = await supabase
          .from("contacts")
          .update(payload)
          .eq("id", contact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", entityId] });
      toast.success(isEdit ? "Contact updated" : "Contact added");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_name">Preferred Name</Label>
            <Input
              id="preferred_name"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="e.g. Bob (for Robert)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="office_phone">Office Phone</Label>
              <Input
                id="office_phone"
                value={officePhone}
                onChange={(e) => setOfficePhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile_phone">Mobile Phone</Label>
              <Input
                id="mobile_phone"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={linkedIn}
                onChange={(e) => setLinkedIn(e.target.value)}
                placeholder="URL or username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teams">Microsoft Teams</Label>
              <Input
                id="teams"
                value={teams}
                onChange={(e) => setTeams(e.target.value)}
                placeholder="email or username"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Preferred Contact Method (legacy)</Label>
              <Select
                value={preferred}
                onValueChange={(v) => setPreferred(v as PreferredContactMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_CONTACT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Communication Method</Label>
              <Select
                value={prefCommV2}
                onValueChange={(v) => setPrefCommV2(v as ContactCommMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_COMM_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Relationship Strength</Label>
              <Select
                value={strength}
                onValueChange={(v) => setStrength(v as ContactRelationshipStrength)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not assessed" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_RELATIONSHIP_STRENGTHS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="best_time">Best Time To Contact</Label>
            <Input
              id="best_time"
              value={bestTime}
              onChange={(e) => setBestTime(e.target.value)}
              placeholder="e.g. 9am-12pm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_notes">Notes</Label>
            <Textarea
              id="contact_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
