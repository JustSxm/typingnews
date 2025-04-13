"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CountrySelectorProps {
	value: string;
	onChange: (value: string) => void;
}

const countries = [
	{ code: "us", name: "US (English)", flag: "🇺🇸" },
	{ code: "ca", name: "Canada (French)", flag: "🇨🇦" },
];

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
	const selectedCountry = countries.find((country) => country.code === value) || countries[0];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="w-full justify-start gap-2">
					<span className="text-lg">{selectedCountry.flag}</span>
					<span>{selectedCountry.name}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-full">
				{countries.map((country) => (
					<DropdownMenuItem key={country.code} onClick={() => onChange(country.code)} className="gap-2">
						<span className="text-lg">{country.flag}</span>
						<span>{country.name}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
